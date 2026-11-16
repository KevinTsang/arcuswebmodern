import { render, screen } from '@testing-library/react';
import { Device } from '@arcus/core';
import { DeviceConfigurationPanel } from '@/components/devices/DeviceConfigurationPanel';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevice: DeviceEntity | undefined;
let mockConfigurators: string[] = [];

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceConfig', () => ({
  useDeviceConfigurators: () => mockConfigurators,
}));

function stub(testId: string) {
  return { __esModule: true, default: () => <div data-testid={testId} /> };
}

jest.mock('@/components/devices/BrightnessConfigurator', () => stub('cfg-brightness'));
jest.mock('@/components/devices/FanSpeedConfigurator', () => stub('cfg-fan'));
jest.mock('@/components/devices/ThermostatModeConfigurator', () => stub('cfg-thermostat'));
jest.mock('@/components/devices/ColorConfigurator', () => stub('cfg-color'));
jest.mock('@/components/devices/ContactSettingConfigurator', () => stub('cfg-contact'));
jest.mock('@/components/devices/DeviceSettingsConfigurator', () => stub('cfg-settings'));
jest.mock('@/components/devices/WaterHeaterModeConfigurator', () => ({
  WaterHeaterModeConfigurator: () => <div data-testid="cfg-water-heater-mode" />,
}));
jest.mock('@/components/devices/WaterSoftenerRechargeTimeConfigurator', () => ({
  WaterSoftenerRechargeTimeConfigurator: () => <div data-testid="cfg-recharge-time" />,
}));
jest.mock('@/components/devices/WaterFlowConfigurator', () => ({
  WaterFlowConfigurator: () => <div data-testid="cfg-water-flow" />,
}));
jest.mock('@/components/devices/WaterHardnessConfigurator', () => ({
  WaterHardnessConfigurator: () => <div data-testid="cfg-water-hardness" />,
}));
jest.mock('@/components/devices/WaterSaltConfigurator', () => ({
  WaterSaltConfigurator: () => <div data-testid="cfg-water-salt" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:softener';

beforeEach(() => {
  mockDevice = makeDevice(ADDRESS, { [Device.ATTR_NAME]: 'EcoWater Softener' });
  mockConfigurators = [];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceConfigurationPanel', () => {
  it('matches snapshot', () => {
    mockConfigurators = ['water-softener-recharge-time', 'water-salt-type'];
    const { asFragment } = render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders nothing without a device', () => {
    mockDevice = undefined;
    const { container } = render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the empty state when there is nothing to configure', () => {
    render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(screen.getByText('EcoWater Softener')).toBeInTheDocument();
    expect(screen.getByTestId('config-empty')).toBeInTheDocument();
  });

  it.each([
    ['water-heater-mode', 'cfg-water-heater-mode'],
    ['water-softener-recharge-time', 'cfg-recharge-time'],
    ['water-flow', 'cfg-water-flow'],
    ['water-hardness', 'cfg-water-hardness'],
    ['water-salt-type', 'cfg-water-salt'],
  ])('renders the %s configurator', (key, testId) => {
    mockConfigurators = [key];
    render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('shows a placeholder for configurators that are not built yet', () => {
    mockConfigurators = ['somfy-type'];
    render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(screen.getByText('somfy-type configurator (coming soon)')).toBeInTheDocument();
  });
});
