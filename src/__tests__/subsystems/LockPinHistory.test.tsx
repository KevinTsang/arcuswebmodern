import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Device } from '@arcus/core';
import { LockPinHistory, PIN_HISTORY_PAGE_SIZE } from '@/components/subsystems/LockPinHistory';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const LOCK = 'DRIV:dev:lock1';
const TS = new Date(2026, 10, 12, 9, 30).getTime();

const page1 = {
  results: [
    { timestamp: TS, subjectName: 'Front Door', longMessage: 'Front Door was unlocked by Alice Johnson.' },
    { timestamp: TS - 60_000, subjectName: 'Front Door', longMessage: 'Front Door was locked.' },
  ],
  nextToken: 'tok-2',
};

const page2 = {
  results: [{ timestamp: TS - 120_000, subjectName: 'Front Door', longMessage: 'Invalid PIN entered at Front Door.' }],
};

const openHistory = () => fireEvent.click(screen.getByTestId(`lock-history-toggle-${LOCK}`));

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue(page1);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('LockPinHistory', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<LockPinHistory lockAddress={LOCK} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('is collapsed and does not fetch until opened', () => {
    render(<LockPinHistory lockAddress={LOCK} />);
    expect(screen.getByText('Show PIN history')).toBeInTheDocument();
    expect(screen.queryByTestId(`lock-history-${LOCK}`)).not.toBeInTheDocument();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('loads the lock history when opened', async () => {
    render(<LockPinHistory lockAddress={LOCK} />);
    openHistory();
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      Device.CMD_LISTHISTORYENTRIES, LOCK, { limit: PIN_HISTORY_PAGE_SIZE, token: undefined },
    );
    expect(await screen.findByText('Front Door was unlocked by Alice Johnson.')).toBeInTheDocument();
    expect(screen.getByText('Front Door was locked.')).toBeInTheDocument();
    expect(screen.getByTestId(`lock-history-toggle-${LOCK}`)).toHaveAttribute('aria-expanded', 'true');
  });

  it('loads the next page on request', async () => {
    render(<LockPinHistory lockAddress={LOCK} />);
    openHistory();
    mockBridgeRequest.mockResolvedValueOnce(page2);
    fireEvent.click(await screen.findByTestId(`lock-history-more-${LOCK}`));
    expect(mockBridgeRequest).toHaveBeenLastCalledWith(
      Device.CMD_LISTHISTORYENTRIES, LOCK, { limit: PIN_HISTORY_PAGE_SIZE, token: 'tok-2' },
    );
    expect(await screen.findByText('Invalid PIN entered at Front Door.')).toBeInTheDocument();
    expect(screen.getByText('Front Door was locked.')).toBeInTheDocument();
    expect(screen.queryByTestId(`lock-history-more-${LOCK}`)).not.toBeInTheDocument();
  });

  it('does not refetch when closed and reopened', async () => {
    render(<LockPinHistory lockAddress={LOCK} />);
    openHistory();
    await screen.findByText('Front Door was locked.');
    openHistory();
    expect(screen.getByText('Show PIN history')).toBeInTheDocument();
    openHistory();
    expect(screen.getByText('Front Door was locked.')).toBeInTheDocument();
    expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
  });

  it('shows an empty message when there is no history', async () => {
    mockBridgeRequest.mockResolvedValueOnce({ results: [] });
    render(<LockPinHistory lockAddress={LOCK} />);
    openHistory();
    expect(await screen.findByTestId(`lock-history-empty-${LOCK}`)).toBeInTheDocument();
  });

  it('shows an error and retries when loading fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<LockPinHistory lockAddress={LOCK} />);
    openHistory();
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to load lock history' },
    }));
    expect(screen.queryByTestId(`lock-history-empty-${LOCK}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`lock-history-retry-${LOCK}`));
    expect(await screen.findByText('Front Door was locked.')).toBeInTheDocument();
    expect(mockBridgeRequest).toHaveBeenCalledTimes(2);
  });

  it('retries the failed page, not the first, when loading more fails', async () => {
    render(<LockPinHistory lockAddress={LOCK} />);
    openHistory();
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    fireEvent.click(await screen.findByTestId(`lock-history-more-${LOCK}`));
    mockBridgeRequest.mockResolvedValueOnce(page2);
    fireEvent.click(await screen.findByTestId(`lock-history-retry-${LOCK}`));
    expect(mockBridgeRequest).toHaveBeenLastCalledWith(
      Device.CMD_LISTHISTORYENTRIES, LOCK, { limit: PIN_HISTORY_PAGE_SIZE, token: 'tok-2' },
    );
    expect(await screen.findByText('Invalid PIN entered at Front Door.')).toBeInTheDocument();
    expect(screen.getByText('Front Door was locked.')).toBeInTheDocument();
  });

  it('copes with a response without results', async () => {
    mockBridgeRequest.mockResolvedValueOnce({});
    render(<LockPinHistory lockAddress={LOCK} />);
    openHistory();
    expect(await screen.findByTestId(`lock-history-empty-${LOCK}`)).toBeInTheDocument();
  });
});
