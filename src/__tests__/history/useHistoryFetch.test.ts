import { renderHook, act, waitFor } from '@testing-library/react';
import useHistoryFetch from '@/components/history/useHistoryFetch';
import Bridge from '@arcus/core/bridge';

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

const mockRequest = Bridge.request as jest.Mock;

const page1 = [
  { timestamp: 1000, subjectName: 'Lock', longMessage: 'Locked' },
  { timestamp: 2000, subjectName: 'Plug', longMessage: 'Turned on' },
];

const page2 = [
  { timestamp: 3000, subjectName: 'Sensor', longMessage: 'Motion detected' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useHistoryFetch – initial fetch', () => {
  it('fetches entries when address is provided', async () => {
    mockRequest.mockResolvedValue({ results: page1, nextToken: undefined });
    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockRequest).toHaveBeenCalledWith('place:ListHistoryEntries', 'SERV:place:place-1', {
      limit: 20,
      token: undefined,
    });
    expect(result.current.entries).toEqual(page1);
  });

  it('does not fetch when address is empty', () => {
    renderHook(() => useHistoryFetch(''));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('sets loading to true while fetching', async () => {
    let resolve: (v: any) => void;
    mockRequest.mockReturnValue(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));

    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => resolve!({ results: page1, nextToken: undefined }));

    expect(result.current.loading).toBe(false);
  });
});

describe('useHistoryFetch – pagination', () => {
  it('sets hasMore when nextToken is present', async () => {
    mockRequest.mockResolvedValue({ results: page1, nextToken: 'token-2' });
    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasMore).toBe(true);
  });

  it('sets hasMore to false when no nextToken', async () => {
    mockRequest.mockResolvedValue({ results: page1, nextToken: undefined });
    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasMore).toBe(false);
  });

  it('sets hasMore to false when results are empty', async () => {
    mockRequest.mockResolvedValue({ results: [], nextToken: 'token-2' });
    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore appends entries from next page', async () => {
    mockRequest
      .mockResolvedValueOnce({ results: page1, nextToken: 'token-2' })
      .mockResolvedValueOnce({ results: page2, nextToken: undefined });

    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual([...page1, ...page2]);
    expect(mockRequest).toHaveBeenCalledWith('place:ListHistoryEntries', 'SERV:place:place-1', {
      limit: 20,
      token: 'token-2',
    });
  });

  it('loadMore does nothing when no nextToken', async () => {
    mockRequest.mockResolvedValue({ results: page1, nextToken: undefined });
    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.loadMore());

    // Should not have made a second request
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});

describe('useHistoryFetch – refresh', () => {
  it('resets entries and re-fetches from the beginning', async () => {
    const freshEntries = [{ timestamp: 9000, subjectName: 'Cam', longMessage: 'Recording' }];
    mockRequest
      .mockResolvedValueOnce({ results: page1, nextToken: 'token-2' })
      .mockResolvedValueOnce({ results: freshEntries, nextToken: undefined });

    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual(page1);

    await act(async () => result.current.refresh());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual(freshEntries);
    // Second call should not have a token (fresh fetch)
    expect(mockRequest).toHaveBeenNthCalledWith(2, 'place:ListHistoryEntries', 'SERV:place:place-1', {
      limit: 20,
      token: undefined,
    });
  });
});

describe('useHistoryFetch – address change', () => {
  it('resets and re-fetches when address changes', async () => {
    const deviceEntries = [{ timestamp: 5000, subjectName: 'Lock', longMessage: 'Unlocked' }];
    mockRequest
      .mockResolvedValueOnce({ results: page1, nextToken: undefined })
      .mockResolvedValueOnce({ results: deviceEntries, nextToken: undefined });

    const { result, rerender } = renderHook(
      ({ addr }) => useHistoryFetch(addr),
      { initialProps: { addr: 'SERV:place:place-1' } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual(page1);

    rerender({ addr: 'DRIV:dev:dev-1' });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual(deviceEntries);
    expect(mockRequest).toHaveBeenCalledWith('place:ListHistoryEntries', 'DRIV:dev:dev-1', {
      limit: 20,
      token: undefined,
    });
  });
});

describe('useHistoryFetch – error handling', () => {
  it('sets hasMore to false on fetch error', async () => {
    mockRequest.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasMore).toBe(false);
    expect(result.current.entries).toEqual([]);
  });

  it('handles missing results gracefully', async () => {
    mockRequest.mockResolvedValue({});
    const { result } = renderHook(() => useHistoryFetch('SERV:place:place-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });
});
