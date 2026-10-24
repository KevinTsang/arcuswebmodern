import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Hub, HubAdvanced, HubZwave } from '@arcus/core';
import { ZWaveTools } from '@/components/devices/ZWaveTools';
import { UnpairingAction } from '@/lib/hubUnpairing';
import type { HubData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
let mockCurrentDispatch: jest.Mock = mockDispatch;

// Cornea event listeners captured for manual triggering in tests
const corneaListeners: Record<string, Array<(...args: any[]) => void>> = {};

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@arcus/core/cornea', () => ({
  __esModule: true,
  default: {
    on: (event: string, listener: (...args: any[]) => void) => {
      if (!corneaListeners[event]) corneaListeners[event] = [];
      corneaListeners[event].push(listener);
    },
    off: (event: string, listener: (...args: any[]) => void) => {
      if (corneaListeners[event]) {
        corneaListeners[event] = corneaListeners[event].filter((l) => l !== listener);
      }
    },
  },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

let mockHub: HubData | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      hub: { hub: mockHub },
    }),
  useAppDispatch: () => mockCurrentDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

// Hub events are emitted under the `hub` namespace (address SERV:<hubId>:hub).
const HUB_ADDRESS = 'SERV:hub-1:hub';
const HUB_VALUECHANGE = `${Hub.NAMESPACE} ${Base.EVENT_VALUECHANGE}`;
const HUB_DEVICE_REMOVED = `${Hub.NAMESPACE} ${HubAdvanced.EVENT_UNPAIREDDEVICEREMOVED}`;
const STOP_FAILED = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to stop Z-Wave device removal' } };
const DEVICE_REMOVED = { type: 'ui/addNotification', payload: { type: 'success', message: 'A device was removed.' } };

/** The hub attributes a hub base:ValueChange can carry that the search watches. */
interface HubChange {
  [Hub.ATTR_STATE]?: string;
  [HubZwave.ATTR_NUMDEVICES]?: number;
}

function emitCornea(event: string, ...args: any[]) {
  (corneaListeners[event] ?? []).forEach((l) => l(...args));
}

function emitHubChange(attrs: HubChange, address = HUB_ADDRESS) {
  act(() => {
    emitCornea(HUB_VALUECHANGE, { [Base.ATTR_ADDRESS]: address, ...attrs });
  });
}

function emitDeviceRemoved(address = HUB_ADDRESS) {
  act(() => {
    emitCornea(HUB_DEVICE_REMOVED, { [Base.ATTR_ADDRESS]: address, devTypeGuess: 'Switch' });
  });
}

/** The hub leaving unpairing mode on its own (its 2-minute timeout). */
function hubTimesOut() {
  emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function startCalls() {
  return mockBridgeRequest.mock.calls.filter(
    ([cmd, , attrs]) => cmd === Hub.CMD_UNPAIRINGREQUEST && attrs.actionType === UnpairingAction.START,
  );
}

function stopCalls() {
  return mockBridgeRequest.mock.calls.filter(
    ([cmd, , attrs]) => cmd === Hub.CMD_UNPAIRINGREQUEST && attrs.actionType === UnpairingAction.STOP,
  );
}

function modalState() {
  return screen.queryByTestId('zwave-remove-modal')?.getAttribute('data-state') ?? 'closed';
}

/** Open the section and start a search; the hub reports UNPAIRING as it does for a real START. */
async function openSearch() {
  const utils = render(<ZWaveTools />);
  fireEvent.click(screen.getByText('Remove Z-Wave Device'));
  fireEvent.click(screen.getByText('Remove Z-Wave Devices'));
  await waitFor(() => expect(screen.getByText('Searching...')).toBeInTheDocument());
  await act(async () => {});
  emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_UNPAIRING });
  return utils;
}

async function cancelWithFailedStop() {
  const utils = await openSearch();
  mockBridgeRequest.mockRejectedValueOnce(new Error('hub offline'));
  fireEvent.click(screen.getByTestId('zwave-remove-cancel'));
  await waitFor(() => expect(screen.getByTestId('zwave-remove-stop-failed')).toBeInTheDocument());
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentDispatch = mockDispatch;
  // Clear cornea listeners
  Object.keys(corneaListeners).forEach((k) => delete corneaListeners[k]);
  mockHub = {
    [Base.ATTR_ADDRESS]: HUB_ADDRESS,
    [HubZwave.ATTR_NUMDEVICES]: 5,
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
  };
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ZWaveTools – snapshots', () => {
  it('matches snapshot', () => {
    const { container } = render(<ZWaveTools />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot with the stop retry offered', async () => {
    const { container } = await cancelWithFailedStop();
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('ZWaveTools – Remove Z-Wave Device section', () => {
  it('shows Remove Z-Wave Device accordion', () => {
    render(<ZWaveTools />);
    expect(screen.getByText('Remove Z-Wave Device')).toBeInTheDocument();
  });

  it('shows removal instructions when expanded', () => {
    render(<ZWaveTools />);
    fireEvent.click(screen.getByText('Remove Z-Wave Device'));
    expect(screen.getByText('Remove Z-Wave Devices')).toBeInTheDocument();
    expect(screen.getByText(/orphaned Z-Wave devices/)).toBeInTheDocument();
  });

  it('shows Remove Z-Wave Devices button when expanded', () => {
    render(<ZWaveTools />);
    fireEvent.click(screen.getByText('Remove Z-Wave Device'));
    const removeBtn = screen.getByText('Remove Z-Wave Devices');
    expect(removeBtn.tagName).toBe('BUTTON');
  });
});

describe('ZWaveTools – Orphan removal modal', () => {
  it('opens search modal when Remove Z-Wave Devices is clicked', async () => {
    await openSearch();
    expect(modalState()).toBe('search');
  });

  it('calls hub:UnpairingRequest with START_UNPAIRING', async () => {
    await openSearch();
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      Hub.CMD_UNPAIRINGREQUEST,
      HUB_ADDRESS,
      expect.objectContaining({ actionType: UnpairingAction.START, timeout: 120000 }),
    );
  });

  it('shows learn mode instructions in search modal', async () => {
    await openSearch();
    // Modal-specific text (different from accordion text)
    expect(screen.getByText(/Check your manufacturer's manual/)).toBeInTheDocument();
  });

  it('calls STOP_UNPAIRING and closes modal on Cancel', async () => {
    await openSearch();
    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));

    expect(modalState()).toBe('closed');
    await waitFor(() =>
      expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB_ADDRESS, {
        actionType: UnpairingAction.STOP,
      }),
    );
  });

  it('notifies and still closes modal when STOP_UNPAIRING fails', async () => {
    await cancelWithFailedStop();
    expect(mockDispatch).toHaveBeenCalledWith(STOP_FAILED);
    expect(modalState()).toBe('closed');
  });

  it('shows success and stops unpairing as soon as hubzwave:numDevices drops', async () => {
    await openSearch();
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText(/successfully removed/)).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith(DEVICE_REMOVED);
    await waitFor(() => expect(stopCalls()).toHaveLength(1));
  });

  it('shows success when the removal and NORMAL arrive in one change', async () => {
    await openSearch();
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4, [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it.each([
    ['is re-reported unchanged', 5],
    ['goes up', 6],
  ])('does not count a removal when hubzwave:numDevices %s', async (_label, count) => {
    await openSearch();
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: count });

    expect(modalState()).toBe('search');
    expect(mockDispatch).not.toHaveBeenCalledWith(DEVICE_REMOVED);
    expect(stopCalls()).toHaveLength(0);
  });

  it('counts a later decrease from the last reported hubzwave:numDevices', async () => {
    await openSearch();
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 7 });
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 6 });
    expect(modalState()).toBe('success');
  });

  it('ignores the hub entering UNPAIRING', async () => {
    await openSearch();
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_UNPAIRING });
    expect(modalState()).toBe('search');
  });

  it('shows success on hub hubadv:UnpairedDeviceRemoved', async () => {
    await openSearch();
    emitDeviceRemoved();

    expect(mockDispatch).toHaveBeenCalledWith(DEVICE_REMOVED);
    expect(modalState()).toBe('success');
  });

  it('ignores hubadv:UnpairedDeviceRemoved without the hub namespace', async () => {
    await openSearch();
    act(() => {
      emitCornea(HubAdvanced.EVENT_UNPAIREDDEVICEREMOVED, {});
    });
    expect(modalState()).toBe('search');
  });

  it('ignores events from another hub', async () => {
    await openSearch();
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 1 }, 'SERV:hub-2:hub');
    emitDeviceRemoved('SERV:hub-2:hub');
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL }, 'SERV:hub-2:hub');
    expect(modalState()).toBe('search');
  });

  it('reports only the first removal of a search', async () => {
    await openSearch();
    emitDeviceRemoved();
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });
    expect(mockDispatch.mock.calls.filter(([a]) => a.payload.type === 'success')).toHaveLength(1);
  });

  it('sends nothing more when Done is clicked after the stop succeeded', async () => {
    await openSearch();
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });
    await waitFor(() => expect(stopCalls()).toHaveLength(1));

    fireEvent.click(screen.getByTestId('zwave-remove-done'));
    await act(async () => {});
    expect(modalState()).toBe('closed');
    expect(stopCalls()).toHaveLength(1);
  });

  it('shares the stop in flight when Done is clicked right after a removal', async () => {
    const stop = deferred<unknown>();
    await openSearch();
    mockBridgeRequest.mockReturnValueOnce(stop.promise);
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });
    fireEvent.click(screen.getByTestId('zwave-remove-done'));
    await act(async () => { stop.resolve({}); });

    expect(stopCalls()).toHaveLength(1);
    expect(modalState()).toBe('closed');
  });

  it('shows failure when hub returns to NORMAL without device removal', async () => {
    await openSearch();
    hubTimesOut();

    expect(screen.getByText('Removal Timed Out')).toBeInTheDocument();
    expect(screen.getByText(/A device was not removed/)).toBeInTheDocument();
  });

  it('keeps searching when the hub reports NORMAL on reconnecting after DOWN', async () => {
    await openSearch();
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_DOWN });
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    expect(modalState()).toBe('search');

    // The hub may still be unpairing, so Cancel must still stop it.
    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));
    await waitFor(() => expect(stopCalls()).toHaveLength(1));
  });

  it('ignores NORMAL when the hub was never seen unpairing', async () => {
    render(<ZWaveTools />);
    fireEvent.click(screen.getByText('Remove Z-Wave Device'));
    fireEvent.click(screen.getByText('Remove Z-Wave Devices'));
    await act(async () => {});
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    expect(modalState()).toBe('search');
  });

  it('shows Keep Searching and Cancel on failure screen', async () => {
    await openSearch();
    hubTimesOut();

    expect(screen.getByText('Keep Searching')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('restarts search when Keep Searching is clicked', async () => {
    await openSearch();
    hubTimesOut();

    mockBridgeRequest.mockClear();
    fireEvent.click(screen.getByText('Keep Searching'));

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Hub.CMD_UNPAIRINGREQUEST,
        HUB_ADDRESS,
        expect.objectContaining({ actionType: UnpairingAction.START }),
      );
    });
  });

  it('closes modal when Cancel is clicked on failure screen', async () => {
    await openSearch();
    hubTimesOut();

    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Removal Timed Out')).not.toBeInTheDocument());
    // The hub already left unpairing mode.
    expect(stopCalls()).toHaveLength(0);
  });

  it('shows failure modal when UnpairingRequest fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<ZWaveTools />);
    fireEvent.click(screen.getByText('Remove Z-Wave Device'));
    fireEvent.click(screen.getByText('Remove Z-Wave Devices'));
    await waitFor(() => expect(screen.getByText('Removal Timed Out')).toBeInTheDocument());
  });
});

describe('ZWaveTools – closing a search', () => {
  it('ignores the NORMAL caused by Cancel arriving before the STOP reply', async () => {
    const stop = deferred<unknown>();
    await openSearch();
    mockBridgeRequest.mockReturnValueOnce(stop.promise);
    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));

    hubTimesOut();
    expect(modalState()).toBe('closed');

    await act(async () => { stop.resolve({}); });
    expect(modalState()).toBe('closed');
  });

  it('does not close a search restarted before the old STOP reply', async () => {
    const stop = deferred<unknown>();
    const { unmount } = await openSearch();
    hubTimesOut();
    // Failure screen: the hub left unpairing, so Cancel sends nothing; start a
    // search that then gets cancelled with a slow STOP, and restart.
    fireEvent.click(screen.getByText('Keep Searching'));
    await act(async () => {});
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_UNPAIRING });
    mockBridgeRequest.mockReturnValueOnce(stop.promise);
    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));

    fireEvent.click(screen.getByText('Remove Z-Wave Devices'));
    await act(async () => {});
    expect(modalState()).toBe('search');

    await act(async () => { stop.resolve({}); });
    expect(modalState()).toBe('search');

    // The restarted search is still tracked: unmounting stops it.
    unmount();
    expect(stopCalls()).toHaveLength(2);
  });

  it('does not reopen the modal when START fails after Cancel', async () => {
    const start = deferred<unknown>();
    mockBridgeRequest.mockReturnValueOnce(start.promise);
    render(<ZWaveTools />);
    fireEvent.click(screen.getByText('Remove Z-Wave Device'));
    fireEvent.click(screen.getByText('Remove Z-Wave Devices'));
    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));
    await act(async () => {});
    expect(stopCalls()).toHaveLength(1);

    await act(async () => { start.reject(new Error('timeout')); });
    expect(modalState()).toBe('closed');
  });

  it('stops the hub START was sent to, even after the hub leaves the store', async () => {
    const { rerender } = await openSearch();
    mockHub = null;
    rerender(<ZWaveTools />);

    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));
    await waitFor(() =>
      expect(stopCalls()).toEqual([[Hub.CMD_UNPAIRINGREQUEST, HUB_ADDRESS, { actionType: UnpairingAction.STOP }]]),
    );
  });

  it('stops the hub START was sent to when the store hub changes', async () => {
    const { rerender } = await openSearch();
    mockHub = { [Base.ATTR_ADDRESS]: 'SERV:hub-2:hub', [Hub.ATTR_STATE]: Hub.STATE_NORMAL };
    rerender(<ZWaveTools />);

    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));
    await waitFor(() =>
      expect(stopCalls()).toEqual([[Hub.CMD_UNPAIRINGREQUEST, HUB_ADDRESS, { actionType: UnpairingAction.STOP }]]),
    );
  });
});

describe('ZWaveTools – retrying a failed stop', () => {
  it('offers a retry after a failed STOP and hides it once a retry succeeds', async () => {
    await cancelWithFailedStop();
    fireEvent.click(screen.getByTestId('zwave-remove-stop-retry'));

    await waitFor(() => expect(screen.queryByTestId('zwave-remove-stop-failed')).not.toBeInTheDocument());
    expect(stopCalls()).toHaveLength(2);
  });

  it('notifies and keeps the retry when it fails again', async () => {
    await cancelWithFailedStop();
    mockDispatch.mockClear();
    mockBridgeRequest.mockRejectedValueOnce(new Error('hub offline'));
    fireEvent.click(screen.getByTestId('zwave-remove-stop-retry'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(STOP_FAILED));
    expect(screen.getByTestId('zwave-remove-stop-retry')).toBeEnabled();
  });

  it('disables the retry while it is in flight', async () => {
    const stop = deferred<unknown>();
    await cancelWithFailedStop();
    mockBridgeRequest.mockReturnValueOnce(stop.promise);
    fireEvent.click(screen.getByTestId('zwave-remove-stop-retry'));

    expect(screen.getByTestId('zwave-remove-stop-retry')).toBeDisabled();
    expect(screen.getByTestId('zwave-remove-stop-retry')).toHaveTextContent('Stopping...');
    await act(async () => { stop.resolve({}); });
  });

  it('retries the stop on unmount after a failed STOP', async () => {
    const { unmount } = await cancelWithFailedStop();
    unmount();
    expect(stopCalls()).toHaveLength(2);
  });

  it('drops the retry once the hub reports it left unpairing', async () => {
    const { unmount } = await cancelWithFailedStop();
    hubTimesOut();

    expect(screen.queryByTestId('zwave-remove-stop-failed')).not.toBeInTheDocument();
    unmount();
    expect(stopCalls()).toHaveLength(1);
  });

  it('notifies when the stop after a removal fails, and retries it on Done', async () => {
    await openSearch();
    mockBridgeRequest.mockRejectedValueOnce(new Error('hub offline'));
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(STOP_FAILED));

    fireEvent.click(screen.getByTestId('zwave-remove-done'));
    await waitFor(() => expect(stopCalls()).toHaveLength(2));
  });
});

describe('ZWaveTools – stopping unpairing on unmount', () => {
  it('stops unpairing when unmounted mid-search', async () => {
    const { unmount } = await openSearch();
    unmount();

    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB_ADDRESS, {
      actionType: UnpairingAction.STOP,
    });
  });

  it('does not stop unpairing mid-search when the component re-renders with new callbacks', async () => {
    const { rerender } = await openSearch();
    mockCurrentDispatch = jest.fn();
    rerender(<ZWaveTools />);
    await act(async () => {});

    expect(stopCalls()).toHaveLength(0);
    expect(modalState()).toBe('search');
  });

  it('does not stop unpairing on unmount once the hub returned to NORMAL', async () => {
    const { unmount } = await openSearch();
    hubTimesOut();
    unmount();
    expect(stopCalls()).toHaveLength(0);
  });

  it('does not send STOP_UNPAIRING again on unmount after Cancel', async () => {
    const { unmount } = await openSearch();
    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));
    await act(async () => {});
    unmount();
    expect(stopCalls()).toHaveLength(1);
  });

  it('sends nothing on unmount when no search was started', () => {
    const { unmount } = render(<ZWaveTools />);
    unmount();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('stops unpairing from the failure screen when START_UNPAIRING failed', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('timeout'));
    render(<ZWaveTools />);
    fireEvent.click(screen.getByText('Remove Z-Wave Device'));
    fireEvent.click(screen.getByText('Remove Z-Wave Devices'));
    await waitFor(() => expect(screen.getByText('Removal Timed Out')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Removal Timed Out')).not.toBeInTheDocument());
    expect(stopCalls()).toHaveLength(1);
  });

  it('stops a restarted search on unmount', async () => {
    const { unmount } = await openSearch();
    hubTimesOut();
    fireEvent.click(screen.getByText('Keep Searching'));
    await waitFor(() => expect(screen.getByText('Searching...')).toBeInTheDocument());

    unmount();
    expect(startCalls()).toHaveLength(2);
    expect(stopCalls()).toHaveLength(1);
  });

  it('notifies when STOP_UNPAIRING fails on unmount', async () => {
    const { unmount } = await openSearch();
    mockBridgeRequest.mockRejectedValueOnce(new Error('hub offline'));
    await act(async () => { unmount(); });

    expect(mockDispatch).toHaveBeenCalledWith(STOP_FAILED);
  });
});
