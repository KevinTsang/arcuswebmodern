import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceActions } from '@/components/device/DeviceActions';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetAttribute = jest.fn().mockResolvedValue(undefined);

// Mock device state — mutated per test
let mockDevice: Record<string, unknown> = {};

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    sendCommand: jest.fn(),
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSetAttribute.mockClear();
});

describe('DeviceActions – multi-toggle', () => {
  beforeEach(() => {
    mockDevice = {
      'base:caps': ['base', 'swit', 'devconn'],
      'base:instances': { relay1: ['swit'], relay2: ['swit'] },
      'dev:devtypehint': 'Switch',
      'devconn:state': 'ONLINE',
      'swit:state:relay1': 'ON',
      'swit:state:relay2': 'OFF',
    };
  });

  it('renders a toggle for each instance', () => {
    render(<DeviceActions address="DRIV:dev:test" action="multi-toggle" />);
    expect(screen.getByText('Relay 1')).toBeInTheDocument();
    expect(screen.getByText('Relay 2')).toBeInTheDocument();
  });

  it('renders toggle switches with correct aria state', () => {
    render(<DeviceActions address="DRIV:dev:test" action="multi-toggle" />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');  // relay1 ON
    expect(switches[1]).toHaveAttribute('aria-checked', 'false'); // relay2 OFF
  });

  it('sends correct attribute when toggling relay1 off', async () => {
    render(<DeviceActions address="DRIV:dev:test" action="multi-toggle" />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]); // relay1 is ON → turn OFF
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith('swit:state:relay1', 'OFF');
    });
  });

  it('sends correct attribute when toggling relay2 on', async () => {
    render(<DeviceActions address="DRIV:dev:test" action="multi-toggle" />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]); // relay2 is OFF → turn ON
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith('swit:state:relay2', 'ON');
    });
  });

  it('renders nothing when device has no instances', () => {
    mockDevice = {
      'base:caps': ['base', 'swit'],
      'dev:devtypehint': 'Switch',
      'swit:state': 'ON',
    };
    const { container } = render(<DeviceActions address="DRIV:dev:test" action="multi-toggle" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('DeviceActions – multi-toggle with outlet names', () => {
  beforeEach(() => {
    mockDevice = {
      'base:caps': ['base', 'swit', 'devconn'],
      'base:instances': { outlet1: ['swit'], outlet2: ['swit'] },
      'dev:devtypehint': 'Switch',
      'devconn:state': 'ONLINE',
      'swit:state:outlet1': 'OFF',
      'swit:state:outlet2': 'ON',
    };
  });

  it('renders outlet labels', () => {
    render(<DeviceActions address="DRIV:dev:test" action="multi-toggle" />);
    expect(screen.getByText('Outlet 1')).toBeInTheDocument();
    expect(screen.getByText('Outlet 2')).toBeInTheDocument();
  });
});
