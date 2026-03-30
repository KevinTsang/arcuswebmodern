import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base } from '@arcus/core';
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

beforeEach(() => {
  jest.clearAllMocks();
  // Clear cornea listeners
  Object.keys(corneaListeners).forEach((k) => delete corneaListeners[k]);
  mockHub = {
    [Base.ATTR_ADDRESS]: 'SERV:hub:hub-1',
    'hubzwave:numDevices': 5,
    'hub:state': 'NORMAL',
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
        'SERV:hub:hub-1',
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
        'SERV:hub:hub-1',
        expect.objectContaining({ actionType: 'STOP_UNPAIRING' }),
      );
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
  });

  it('logs error and still closes modal when STOP_UNPAIRING fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Cancel')).toBeInTheDocument(),
    );

    mockBridgeRequest.mockRejectedValueOnce(new Error('hub already normal'));
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to stop unpairing:', expect.any(Error));
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('shows success when hubzwave:numDevices changes', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea('SERV base:ValueChange', { 'hubzwave:numDevices': 4 });
    });

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText(/successfully removed/)).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('dispatches success notification when device is removed', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea('SERV base:ValueChange', { 'hubzwave:numDevices': 4 });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'A device was removed.' },
    });
  });

  it('shows success when UnpairedDeviceRemoved event fires', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea('hubadv:UnpairedDeviceRemoved');
    });

    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('closes modal when Done is clicked on success screen', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea('SERV base:ValueChange', { 'hubzwave:numDevices': 4 });
    });

    fireEvent.click(screen.getByText('Done'));
    expect(screen.queryByText('Success!')).not.toBeInTheDocument();
  });

  it('shows failure when hub returns to NORMAL without device removal', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea('SERV base:ValueChange', { 'hub:state': 'NORMAL' });
    });

    expect(screen.getByText('Removal Timed Out')).toBeInTheDocument();
    expect(screen.getByText(/A device was not removed/)).toBeInTheDocument();
  });

  it('shows Keep Searching and Cancel on failure screen', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea('SERV base:ValueChange', { 'hub:state': 'NORMAL' });
    });

    expect(screen.getByText('Keep Searching')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('restarts search when Keep Searching is clicked', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea('SERV base:ValueChange', { 'hub:state': 'NORMAL' });
    });

    mockBridgeRequest.mockClear();
    fireEvent.click(screen.getByText('Keep Searching'));

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'hub:UnpairingRequest',
        'SERV:hub:hub-1',
        expect.objectContaining({ actionType: 'START_UNPAIRING' }),
      );
    });
  });

  it('closes modal when Cancel is clicked on failure screen', async () => {
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Searching...')).toBeInTheDocument(),
    );

    act(() => {
      emitCornea('SERV base:ValueChange', { 'hub:state': 'NORMAL' });
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Removal Timed Out')).not.toBeInTheDocument();
  });

  it('shows failure modal when UnpairingRequest fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    openRemoveModal();
    await waitFor(() =>
      expect(screen.getByText('Removal Timed Out')).toBeInTheDocument(),
    );
  });
});
