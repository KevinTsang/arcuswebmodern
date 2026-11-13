import { render, screen } from '@testing-library/react';
import { Base, Device, HoneywellTCC, NestThermostat, Thermostat } from '@arcus/core';
import { ThermostatIntegrationDetails } from '@/components/devices/ThermostatIntegrationDetails';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:therm';
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const c = (f: number) => (f - 32) * 5 / 9;

function nest(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDR, {
    [Device.ATTR_DEVTYPEHINT]: 'Nest Thermostat',
    [Base.ATTR_CAPS]: ['therm', NestThermostat.NAMESPACE],
    [NestThermostat.ATTR_ROOMNAME]: 'Hallway',
    [NestThermostat.ATTR_LOCKED]: true,
    [NestThermostat.ATTR_LOCKEDTEMPMIN]: c(62),
    [NestThermostat.ATTR_LOCKEDTEMPMAX]: c(78),
    ...overrides,
  });
}

function tcc(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDR, {
    [Device.ATTR_DEVTYPEHINT]: 'TCCThermostat',
    [Base.ATTR_CAPS]: ['therm', HoneywellTCC.NAMESPACE],
    [Thermostat.ATTR_SUPPORTSAUTO]: true,
    [HoneywellTCC.ATTR_REQUIRESLOGIN]: false,
    [HoneywellTCC.ATTR_AUTHORIZATIONSTATE]: HoneywellTCC.AUTHORIZATIONSTATE_AUTHORIZED,
    ...overrides,
  });
}

beforeEach(() => {
  mockDevice = nest();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ThermostatIntegrationDetails', () => {
  it('matches snapshot for a Nest thermostat', () => {
    const { asFragment } = render(<ThermostatIntegrationDetails address={ADDR} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Nest', () => {
    it('shows the room and temperature lock range', () => {
      render(<ThermostatIntegrationDetails address={ADDR} />);
      expect(screen.getByTestId('thermostat-nest-room')).toHaveTextContent('Hallway');
      expect(screen.getByTestId('thermostat-nest-lock')).toHaveTextContent('On (62° - 78°)');
    });

    it('shows the lock as off and a dash for a missing room', () => {
      mockDevice = nest({ [NestThermostat.ATTR_LOCKED]: false, [NestThermostat.ATTR_ROOMNAME]: '' });
      render(<ThermostatIntegrationDetails address={ADDR} />);
      expect(screen.getByTestId('thermostat-nest-room')).toHaveTextContent('-');
      expect(screen.getByTestId('thermostat-nest-lock')).toHaveTextContent('Off');
    });
  });

  describe('Honeywell TCC', () => {
    it('renders nothing when the account is healthy and Auto is enabled', () => {
      mockDevice = tcc();
      const { container } = render(<ThermostatIntegrationDetails address={ADDR} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('asks for attention when Honeywell needs a login', () => {
      mockDevice = tcc({ [HoneywellTCC.ATTR_REQUIRESLOGIN]: true });
      render(<ThermostatIntegrationDetails address={ADDR} />);
      expect(screen.getByTestId('thermostat-tcc-account')).toHaveTextContent('Honeywell login information needs attention.');
    });

    it('reports a revoked Honeywell account', () => {
      mockDevice = tcc({ [HoneywellTCC.ATTR_AUTHORIZATIONSTATE]: HoneywellTCC.AUTHORIZATIONSTATE_DEAUTHORIZED });
      render(<ThermostatIntegrationDetails address={ADDR} />);
      expect(screen.getByTestId('thermostat-tcc-account')).toHaveTextContent('Honeywell account information revoked.');
    });

    it('explains how to enable Auto mode', () => {
      mockDevice = tcc({ [Thermostat.ATTR_SUPPORTSAUTO]: false });
      render(<ThermostatIntegrationDetails address={ADDR} />);
      expect(screen.getByTestId('thermostat-tcc-details')).toHaveTextContent('Honeywell requires you to first enable the Auto mode setting');
      expect(screen.queryByTestId('thermostat-tcc-account')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders nothing for a regular thermostat', () => {
      mockDevice = makeDevice(ADDR, { [Device.ATTR_DEVTYPEHINT]: 'Thermostat' });
      const { container } = render(<ThermostatIntegrationDetails address={ADDR} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the device is missing', () => {
      mockDevice = undefined;
      const { container } = render(<ThermostatIntegrationDetails address={ADDR} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
