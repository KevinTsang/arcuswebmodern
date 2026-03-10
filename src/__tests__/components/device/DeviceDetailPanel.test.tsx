import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceDetailPanel } from '@/components/device/DeviceDetailPanel';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSendCommand = jest.fn().mockResolvedValue(undefined);
const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();

let mockDevice: Record<string, unknown> | undefined = {};

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
      'base:caps': ['base', 'swit', 'ident'],
      'dev:name': 'Kitchen Light',
      'dev:devtypehint': 'Light',
      'devconn:state': 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    expect(screen.getByText('Identify')).toBeInTheDocument();
  });

  it('does not show Identify button when device lacks ident capability', () => {
    mockDevice = {
      'base:caps': ['base', 'swit'],
      'dev:name': 'Door Sensor',
      'dev:devtypehint': 'Contact',
      'devconn:state': 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    expect(screen.queryByText('Identify')).not.toBeInTheDocument();
  });

  it('does not show Identify button when base:caps is missing', () => {
    mockDevice = {
      'dev:name': 'Unknown Device',
      'devconn:state': 'ONLINE',
    };
    render(<DeviceDetailPanel address="DRIV:dev:test" />);
    expect(screen.queryByText('Identify')).not.toBeInTheDocument();
  });

  it('sends ident:Identify command when clicked', async () => {
    mockDevice = {
      'base:caps': ['base', 'ident'],
      'dev:name': 'Z-Wave Switch',
      'devconn:state': 'ONLINE',
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
      'base:caps': ['base', 'ident'],
      'dev:name': 'Test Device',
      'devconn:state': 'ONLINE',
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
      'base:caps': ['base', 'ident'],
      'dev:name': 'Flaky Device',
      'devconn:state': 'ONLINE',
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
