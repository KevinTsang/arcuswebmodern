import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Device, DeviceAdvanced, DeviceConnection } from '@arcus/core';
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
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn().mockResolvedValue({}) },
}));

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
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
