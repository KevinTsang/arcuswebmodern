import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Device, DeviceAdvanced, DeviceConnection, Hub } from '@arcus/core';
import { DeviceDetailPanel } from '@/components/devices/DeviceDetailPanel';
import type { DeviceEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSendCommand = jest.fn().mockResolvedValue(undefined);
const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();

let mockDevice: DeviceEntity | undefined = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test' };

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    sendCommand: mockSendCommand,
  }),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: any) => any) =>
    sel({ hub: { hub: { [Base.ATTR_ADDRESS]: 'SERV:hub-1:hub' } } }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

const corneaListeners: Record<string, Array<(...args: any[]) => void>> = {};

jest.mock('@arcus/core/cornea', () => ({
  __esModule: true,
  default: {
    on: (event: string, listener: (...args: any[]) => void) => {
      (corneaListeners[event] ??= []).push(listener);
    },
    off: (event: string, listener: (...args: any[]) => void) => {
      corneaListeners[event] = (corneaListeners[event] ?? []).filter((l) => l !== listener);
    },
  },
}));

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

describe('DeviceDetailPanel – Identify button', () => {
  it('shows Identify button when device has ident capability', () => {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Base.ATTR_CAPS]: ['base', 'swit', 'ident'],
      [Device.ATTR_NAME]: 'Kitchen Light',
      [Device.ATTR_DEVTYPEHINT]: 'Light',
      [DeviceConnection.ATTR_STATE]: 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    expect(screen.getByText('Identify')).toBeInTheDocument();
  });

  it('does not show Identify button when device lacks ident capability', () => {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Base.ATTR_CAPS]: ['base', 'swit'],
      [Device.ATTR_NAME]: 'Door Sensor',
      [Device.ATTR_DEVTYPEHINT]: 'Contact',
      [DeviceConnection.ATTR_STATE]: 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    expect(screen.queryByText('Identify')).not.toBeInTheDocument();
  });

  it('does not show Identify button when base:caps is missing', () => {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Device.ATTR_NAME]: 'Unknown Device',
      [DeviceConnection.ATTR_STATE]: 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    expect(screen.queryByText('Identify')).not.toBeInTheDocument();
  });

  it('sends ident:Identify command when clicked', async () => {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Base.ATTR_CAPS]: ['base', 'ident'],
      [Device.ATTR_NAME]: 'Z-Wave Switch',
      [DeviceConnection.ATTR_STATE]: 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Identify'));
    await waitFor(() => {
      expect(mockSendCommand).toHaveBeenCalledWith('ident:Identify');
    });
  });

  it('shows Identifying... text while command is in flight', async () => {
    let resolveIdentify: () => void;
    mockSendCommand.mockImplementation(
      () => new Promise<void>((resolve) => { resolveIdentify = resolve; }),
    );
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Base.ATTR_CAPS]: ['base', 'ident'],
      [Device.ATTR_NAME]: 'Test Device',
      [DeviceConnection.ATTR_STATE]: 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Identify'));

    await waitFor(() => {
      expect(screen.getByText('Identifying...')).toBeInTheDocument();
    });

    // Resolve and verify it returns to normal
    resolveIdentify!();
    await waitFor(() => {
      expect(screen.getByText('Identify')).toBeInTheDocument();
    });
  });

  it('dispatches error notification when identify fails', async () => {
    mockSendCommand.mockRejectedValueOnce(new Error('timeout'));
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Base.ATTR_CAPS]: ['base', 'ident'],
      [Device.ATTR_NAME]: 'Flaky Device',
      [DeviceConnection.ATTR_STATE]: 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Identify'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { type: 'error', message: 'Failed to identify device' },
        }),
      );
    });
  });

  it('renders nothing when device is undefined', () => {
    mockDevice = undefined;
    const { container } = render(<DeviceDetailPanel address="DRIV:dev:missing" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('DeviceDetailPanel – info rows', () => {
  function renderWith(attrs: Partial<DeviceEntity>) {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Device.ATTR_NAME]: 'Motion Sensor',
      [DeviceConnection.ATTR_STATE]: 'ONLINE',
      ...attrs,
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
  }

  it.each([
    ['ZIGB', 'Zigbee'],
    ['ZWAV', 'Z-Wave'],
    ['IPCD', 'Wi-Fi'],
    ['MOCK', 'MOCK'],
  ])('shows protocol %s as %s', (code, label) => {
    renderWith({ [DeviceAdvanced.ATTR_PROTOCOL]: code });
    expect(screen.getByTestId('device-detail-protocol')).toHaveTextContent(label);
  });

  it('shows Online for a connected device', () => {
    renderWith({});
    expect(screen.getByTestId('device-detail-connection')).toHaveTextContent('Online');
  });

  it('shows Offline for a disconnected device', () => {
    renderWith({ [DeviceConnection.ATTR_STATE]: 'OFFLINE' });
    expect(screen.getByTestId('device-detail-connection')).toHaveTextContent('Offline');
  });
});

describe('DeviceDetailPanel – removal', () => {
  const STEPS = [{ id: 'pair/remove1', order: 1, instructions: ['Press the Z-Wave button.'] }];

  beforeEach(() => {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Device.ATTR_NAME]: 'Hall Switch',
      [DeviceConnection.ATTR_STATE]: 'ONLINE',
    };
    mockBridgeRequest.mockImplementation((cmd: string) =>
      Promise.resolve(cmd === Device.CMD_REMOVE ? { mode: 'HUB_MANUAL', steps: STEPS } : {}),
    );
  });

  async function confirmRemove() {
    const utils = render(<DeviceDetailPanel address="DRIV:dev:test" />);
    fireEvent.click(screen.getByTestId('device-remove'));
    fireEvent.click(screen.getByTestId('device-remove-confirm'));
    await waitFor(() => expect(screen.getByTestId('device-remove-status')).toBeInTheDocument());
    return utils;
  }

  it('shows the removal steps instead of reporting success straight away', async () => {
    await confirmRemove();

    expect(mockBridgeRequest).toHaveBeenCalledWith(Device.CMD_REMOVE, 'DRIV:dev:test', {});
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Remove Hall Switch');
    expect(screen.getByTestId('device-remove-step-0')).toHaveTextContent('Press the Z-Wave button.');
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('reports success and closes once the device is deleted, even after it leaves the store', async () => {
    const { rerender, container } = await confirmRemove();

    // base:Deleted also removes the device from the store; the panel renders
    // nothing from then on but must still report the removal.
    mockDevice = undefined;
    rerender(<DeviceDetailPanel address="DRIV:dev:test" />);
    expect(container.innerHTML).toBe('');

    act(() => {
      (corneaListeners[`${Device.NAMESPACE} ${Base.EVENT_DELETED}`] ?? []).forEach((l) =>
        l({ [Base.ATTR_ADDRESS]: 'DRIV:dev:test' }),
      );
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Hall Switch removed' },
    });
    expect(mockCloseRight).toHaveBeenCalled();
    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, 'SERV:hub-1:hub', {
      actionType: 'STOP_UNPAIRING',
    });
  });

  it('stops unpairing and closes on Cancel', async () => {
    await confirmRemove();
    fireEvent.click(screen.getByTestId('device-remove-abort'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, 'SERV:hub-1:hub', {
      actionType: 'STOP_UNPAIRING',
    });
  });

  it('stops unpairing when the panel is closed mid-removal', async () => {
    const { unmount } = await confirmRemove();
    unmount();
    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, 'SERV:hub-1:hub', {
      actionType: 'STOP_UNPAIRING',
    });
  });

  it('notifies and keeps the prompt when dev:Remove fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('nope'));
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    fireEvent.click(screen.getByTestId('device-remove'));
    fireEvent.click(screen.getByTestId('device-remove-confirm'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to remove Hall Switch' },
      }),
    );
    expect(screen.getByTestId('device-remove-confirm')).toHaveTextContent('Yes, Remove');
    expect(mockCloseRight).not.toHaveBeenCalled();
  });
});
