import { render, screen } from '@testing-library/react';
import { Base, DoorLock, Shade, Somfyv1, Valve } from '@arcus/core';
import { DeviceActions } from '@/components/devices/DeviceActions';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

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

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
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
    mockDevice = makeDevice('DRIV:dev:test', { [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_LOCKED });
    render(<DeviceActions address="DRIV:dev:test" action="lock-unlock" />);
    expect(screen.getByTestId('device-lock-toggle-DRIV:dev:test')).toHaveTextContent('Unlock');
    expect(screen.getByTestId('device-lock-toggle-DRIV:dev:test')).toBeEnabled();
  });

  it('renders OpenCloseValve for open-close-valve action', () => {
    mockDevice = makeDevice('DRIV:dev:test', { [Valve.ATTR_VALVESTATE]: Valve.VALVESTATE_OPEN });
    render(<DeviceActions address="DRIV:dev:test" action="open-close-valve" />);
    expect(screen.getByTestId('device-valve-toggle-DRIV:dev:test')).toHaveTextContent('Close');
    expect(screen.getByTestId('device-valve-toggle-DRIV:dev:test')).toBeEnabled();
  });

  it('renders ThermostatControl for thermostat-slider action', () => {
    render(<DeviceActions address="DRIV:dev:test" action="thermostat-slider" />);
    // Off mode renders "Off" text
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('renders ShadeLevelControl for changeShadeLevel action', () => {
    mockDevice = makeDevice('DRIV:dev:test', { [Shade.ATTR_LEVEL]: 40 });
    render(<DeviceActions address="DRIV:dev:test" action="changeShadeLevel" />);
    expect(screen.getByTestId('device-shade-level-DRIV:dev:test')).toHaveTextContent('40%');
  });

  it('renders BlindStateControl for changeBlindState action', () => {
    mockDevice = makeDevice('DRIV:dev:test', { [Somfyv1.ATTR_TYPE]: Somfyv1.TYPE_BLIND });
    render(<DeviceActions address="DRIV:dev:test" action="changeBlindState" />);
    expect(screen.getByTestId('device-blind-open-DRIV:dev:test')).toHaveTextContent('Open');
    expect(screen.getByTestId('device-blind-favorite-DRIV:dev:test')).toBeEnabled();
  });
});
