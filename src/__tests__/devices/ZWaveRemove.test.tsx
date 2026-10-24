import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Hub, HubAdvanced, HubZwave } from '@arcus/core';
import { ZWaveTools } from '@/components/devices/ZWaveTools';
import type { ArcusEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

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

let mockHub: ArcusEntity | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      hub: { hub: mockHub },
    }),
  useAppDispatch: () => mockDispatch,
}));

function emitCornea(event: string, ...args: any[]) {
  (corneaListeners[event] ?? []).forEach((l) => l(...args));
}

// Hub events are emitted under the `hub` namespace (address SERV:<hubId>:hub).
const HUB_ADDRESS = 'SERV:hub-1:hub';
const HUB_VALUECHANGE = `${Hub.NAMESPACE} ${Base.EVENT_VALUECHANGE}`;

function emitHubChange(attrs: Record<string, unknown>) {
  act(() => {
    emitCornea(HUB_VALUECHANGE, { [Base.ATTR_ADDRESS]: HUB_ADDRESS, ...attrs });
  });
}

function stopCalls() {
  return mockBridgeRequest.mock.calls.filter(
    ([cmd, , attrs]) => cmd === Hub.CMD_UNPAIRINGREQUEST && attrs.actionType === 'STOP_UNPAIRING',
  );
}

beforeEach(() => {
  jest.clearAllMocks();
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
  function openRemoveModal() {
    render(<ZWaveTools />);
    fireEvent.click(screen.getByText('Remove Z-Wave Device'));
    fireEvent.click(screen.getByText('Remove Z-Wave Devices'));
  }

  it('opens search modal when Remove Z-Wave Devices is clicked', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );
  });

  it('calls hub:UnpairingRequest with START_UNPAIRING', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'hub:UnpairingRequest',
        HUB_ADDRESS,
        expect.objectContaining({
          actionType: 'START_UNPAIRING',
          timeout: 120000,
        }),
      ),
    );
  });

  it('shows learn mode instructions in search modal', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );
    // Modal-specific text (different from accordion text)
    expect(screen.getByText(/Check your manufacturer's manual/)).toBeInTheDocument();
  });

  it('shows Cancel button in search state', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Cancel')).toBeInTheDocument(),
    );
  });

  it('calls STOP_UNPAIRING and closes modal on Cancel', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Cancel')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'hub:UnpairingRequest',
        HUB_ADDRESS,
        expect.objectContaining({ actionType: 'STOP_UNPAIRING' }),
      );
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
  });

  it('notifies and still closes modal when STOP_UNPAIRING fails', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Cancel')).toBeInTheDocument(),
    );

    mockBridgeRequest.mockRejectedValueOnce(new Error('hub offline'));
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to stop Z-Wave device removal' },
      });
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
  });

  it('keeps searching when hubzwave:numDevices changes, until the hub returns to NORMAL', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });
    expect(screen.getByText('Searching...')).toBeInTheDocument();
    expect(screen.getByTestId('zwave-remove-cancel')).toBeInTheDocument();

    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText(/successfully removed/)).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows success when the removal and NORMAL arrive in one change', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4, [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('ignores the hub entering UNPAIRING', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_UNPAIRING });
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('dispatches success notification when device is removed', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'A device was removed.' },
    });
  });

  it('notifies on UnpairedDeviceRemoved and shows success once the hub returns to NORMAL', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea(HubAdvanced.EVENT_UNPAIREDDEVICEREMOVED);
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'A device was removed.' },
    });
    expect(screen.getByText('Searching...')).toBeInTheDocument();

    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('closes modal when Done is clicked on success screen, without stopping a finished search', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });

    fireEvent.click(screen.getByText('Done'));
    await waitFor(() => expect(screen.queryByText('Success!')).not.toBeInTheDocument());
    expect(stopCalls()).toHaveLength(0);
  });

  it('shows failure when hub returns to NORMAL without device removal', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });

    expect(screen.getByText('Removal Timed Out')).toBeInTheDocument();
    expect(screen.getByText(/A device was not removed/)).toBeInTheDocument();
  });

  it('shows Keep Searching and Cancel on failure screen', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });

    expect(screen.getByText('Keep Searching')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('restarts search when Keep Searching is clicked', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });

    mockBridgeRequest.mockClear();
    fireEvent.click(screen.getByText('Keep Searching'));

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'hub:UnpairingRequest',
        HUB_ADDRESS,
        expect.objectContaining({ actionType: 'START_UNPAIRING' }),
      );
    });
  });

  it('closes modal when Cancel is clicked on failure screen', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });

    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Removal Timed Out')).not.toBeInTheDocument());
    // The hub already left unpairing mode.
    expect(stopCalls()).toHaveLength(0);
  });

  it('shows failure modal when UnpairingRequest fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Removal Timed Out')).toBeInTheDocument(),
    );
  });
});

describe('ZWaveTools – stopping unpairing', () => {
  async function openSearch() {
    const utils = render(<ZWaveTools />);
    fireEvent.click(screen.getByText('Remove Z-Wave Device'));
    fireEvent.click(screen.getByText('Remove Z-Wave Devices'));
    await waitFor(() => expect(screen.getByText('Searching...')).toBeInTheDocument());
    return utils;
  }

  it('stops unpairing when unmounted mid-search', async () => {
    const { unmount } = await openSearch();
    unmount();

    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB_ADDRESS, {
      actionType: 'STOP_UNPAIRING',
    });
  });

  it('stops unpairing when unmounted after a device was removed but the hub is still unpairing', async () => {
    const { unmount } = await openSearch();
    emitHubChange({ [HubZwave.ATTR_NUMDEVICES]: 4 });
    unmount();
    expect(stopCalls()).toHaveLength(1);
  });

  it('does not stop unpairing on unmount once the hub returned to NORMAL', async () => {
    const { unmount } = await openSearch();
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    unmount();
    expect(stopCalls()).toHaveLength(0);
  });

  it('does not send STOP_UNPAIRING again on unmount after Cancel', async () => {
    const { unmount } = await openSearch();
    fireEvent.click(screen.getByTestId('zwave-remove-cancel'));
    await waitFor(() => expect(screen.queryByText('Searching...')).not.toBeInTheDocument());
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
    emitHubChange({ [Hub.ATTR_STATE]: Hub.STATE_NORMAL });
    fireEvent.click(screen.getByText('Keep Searching'));
    await waitFor(() => expect(screen.getByText('Searching...')).toBeInTheDocument());

    unmount();
    expect(stopCalls()).toHaveLength(1);
  });

  it('notifies when STOP_UNPAIRING fails on unmount', async () => {
    const { unmount } = await openSearch();
    mockBridgeRequest.mockRejectedValueOnce(new Error('hub offline'));
    await act(async () => { unmount(); });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to stop Z-Wave device removal' },
    });
  });
});
