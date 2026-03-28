import { render, screen } from '@testing-library/react';
import { DeviceActions } from '@/components/devices/DeviceActions';

let mockDevice: Record<string, unknown> = {};

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    sendCommand: jest.fn(),
  }),
}));

jest.mock('@/lib/deviceConfig', () => ({
  resolveDeviceConfig: () => ({
    'web:panel:action': 'toggle-on-off',
    'web:isOnUnlessOffline': false,
    'web:switch:state': 'swit:state',
  }),
}));

jest.mock('@/hooks/useDeviceConfig', () => ({
  isDeviceOn: () => false,
}));

beforeEach(() => {
  mockDevice = {};
});

describe('DeviceActions', () => {
  it('returns null for unknown action', () => {
    const { container } = render(<DeviceActions address="DRIV:dev:test" action="unknown" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders ToggleOnOff for toggle-on-off action', () => {
    render(<DeviceActions address="DRIV:dev:test" action="toggle-on-off" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders LockUnlock for lock-unlock action', () => {
    render(<DeviceActions address="DRIV:dev:test" action="lock-unlock" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders ThermostatControl for thermostat-slider action', () => {
    render(<DeviceActions address="DRIV:dev:test" action="thermostat-slider" />);
    // Off mode renders "Off" text
    expect(screen.getByText('Off')).toBeInTheDocument();
  });
});
