import { render, screen } from '@testing-library/react';
import { Device } from '@arcus/core';
import { DeviceConfigurationPanel } from '@/components/devices/DeviceConfigurationPanel';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:radio';
let mockDevice: DeviceEntity | undefined;
let mockConfigurators: string[] = [];

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceConfig', () => ({
  useDeviceConfigurators: () => mockConfigurators,
}));

jest.mock('@/components/devices/NoaaLocationConfigurator', () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <div data-testid="noaa-location">{address}</div>,
}));

jest.mock('@/components/devices/NoaaRadioConfigurator', () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <div data-testid="noaa-radio">{address}</div>,
}));

jest.mock('@/components/devices/NoaaWeatherAlertsConfigurator', () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <div data-testid="noaa-weather-alerts">{address}</div>,
}));

beforeEach(() => {
  mockDevice = makeDevice(ADDR, { [Device.ATTR_NAME]: 'Halo Plus' });
  mockConfigurators = ['noaa-location', 'noaa-radio', 'noaa-weather-alerts'];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceConfigurationPanel – weather radio configurators', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<DeviceConfigurationPanel address={ADDR} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders each NOAA configurator for the device', () => {
    render(<DeviceConfigurationPanel address={ADDR} />);
    expect(screen.getByText('Halo Plus')).toBeInTheDocument();
    expect(screen.getByTestId('noaa-location')).toHaveTextContent(ADDR);
    expect(screen.getByTestId('noaa-radio')).toHaveTextContent(ADDR);
    expect(screen.getByTestId('noaa-weather-alerts')).toHaveTextContent(ADDR);
    expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument();
  });

  it('renders nothing for a missing device', () => {
    mockDevice = undefined;
    const { container } = render(<DeviceConfigurationPanel address={ADDR} />);
    expect(container).toBeEmptyDOMElement();
  });
});
