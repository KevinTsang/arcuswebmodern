import { render, screen } from '@testing-library/react';
import { Base } from '@arcus/core';
import { DeviceActions } from '@/components/devices/DeviceActions';
import type { DeviceEntity } from '@/store/entityTypes';

let mockDevice: DeviceEntity = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test' };

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
  mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test' };
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
