import { renderHook, waitFor, act } from '@testing-library/react';
import { CareSubsystem } from '@arcus/core';
import { useCareActivity, CARE_ACTIVITY_PAGE_SIZE } from '@/hooks/useCareActivity';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const CARE_ADDR = 'SERV:subcare:place-1';
const DAY_START = new Date(2026, 0, 10).getTime();
const DAY_END = new Date(2026, 0, 11).getTime() - 1;
const HOUR = 60 * 60 * 1000;

function entry(timestamp: number, subjectName = 'Hallway Motion') {
  return { timestamp, subjectName, longMessage: `${subjectName} detected motion.` };
}

const LOAD_ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to load care activity' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({ results: [], nextToken: undefined });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useCareActivity', () => {
  it('requests the selected day starting at its last millisecond', async () => {
    mockBridgeRequest.mockResolvedValueOnce({ results: [entry(DAY_START + 10 * HOUR)] });
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));

    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(mockBridgeRequest).toHaveBeenCalledWith(CareSubsystem.CMD_LISTDETAILEDACTIVITY, CARE_ADDR, {
      limit: CARE_ACTIVITY_PAGE_SIZE,
      token: String(DAY_END),
      devices: undefined,
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(false);
  });

  it('filters by one device when given', async () => {
    renderHook(() => useCareActivity(CARE_ADDR, DAY_START, 'DRIV:dev:motion'));
    await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
      CareSubsystem.CMD_LISTDETAILEDACTIVITY, CARE_ADDR, expect.objectContaining({ devices: ['DRIV:dev:motion'] }),
    ));
  });

  it('pages with the returned token and appends results', async () => {
    mockBridgeRequest
      .mockResolvedValueOnce({ results: [entry(DAY_START + 12 * HOUR)], nextToken: 'next-1' })
      .mockResolvedValueOnce({ results: [entry(DAY_START + 2 * HOUR, 'Back Door')] });
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    act(() => { result.current.loadMore(); });
    await waitFor(() => expect(result.current.entries).toHaveLength(2));

    expect(mockBridgeRequest).toHaveBeenLastCalledWith(
      CareSubsystem.CMD_LISTDETAILEDACTIVITY, CARE_ADDR, expect.objectContaining({ token: 'next-1' }),
    );
    expect(result.current.entries[1].subjectName).toBe('Back Door');
    expect(result.current.hasMore).toBe(false);
  });

  it('stops paging and dispatches an error when a later page fails', async () => {
    mockBridgeRequest
      .mockResolvedValueOnce({ results: [entry(DAY_START + 12 * HOUR)], nextToken: 'next-1' })
      .mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    act(() => { result.current.loadMore(); });
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(LOAD_ERROR));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('reports loading while the first page is in flight', () => {
    mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));
    expect(result.current.loading).toBe(true);
    expect(result.current.entries).toEqual([]);
  });

  it('drops entries outside the day and stops paging once the previous day is reached', async () => {
    mockBridgeRequest.mockResolvedValueOnce({
      results: [entry(DAY_START + HOUR), entry(DAY_START - HOUR, 'Yesterday')],
      nextToken: 'next-1',
    });
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));

    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(result.current.entries[0].timestamp).toBe(DAY_START + HOUR);
    expect(result.current.hasMore).toBe(false);
  });

  it('refreshes from the start of the day', async () => {
    mockBridgeRequest.mockResolvedValueOnce({ results: [entry(DAY_START + HOUR)], nextToken: 'next-1' });
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    act(() => { result.current.refresh(); });
    await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledTimes(2));
    expect(mockBridgeRequest).toHaveBeenLastCalledWith(
      CareSubsystem.CMD_LISTDETAILEDACTIVITY, CARE_ADDR, expect.objectContaining({ token: String(DAY_END) }),
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(0));
  });

  it('refetches when the day changes and ignores the stale response', async () => {
    let resolveFirst: (v: { results: ReturnType<typeof entry>[] }) => void = () => {};
    mockBridgeRequest
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce({ results: [entry(DAY_START - 20 * HOUR, 'Previous day')] });
    const { result, rerender } = renderHook(({ day }) => useCareActivity(CARE_ADDR, day), {
      initialProps: { day: DAY_START },
    });

    rerender({ day: DAY_START - 24 * HOUR });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    await act(async () => resolveFirst({ results: [entry(DAY_START + HOUR, 'Stale')] }));
    expect(result.current.entries.map((e) => e.subjectName)).toEqual(['Previous day']);
  });

  it('dispatches an error when the request fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(LOAD_ERROR));
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('does not request without an address', () => {
    const { result } = renderHook(() => useCareActivity(undefined, DAY_START));
    expect(mockBridgeRequest).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('ignores loadMore without a next token', async () => {
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.loadMore(); });
    expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
  });

  it('treats a missing results list as empty', async () => {
    mockBridgeRequest.mockResolvedValueOnce({});
    const { result } = renderHook(() => useCareActivity(CARE_ADDR, DAY_START));
    await act(() => mockBridgeRequest.mock.results[0].value);
    expect(result.current.entries).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });
});
