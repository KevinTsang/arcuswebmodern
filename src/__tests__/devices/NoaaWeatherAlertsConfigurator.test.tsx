import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeatherRadio } from '@arcus/core';
import NoaaWeatherAlertsConfigurator from '@/components/devices/NoaaWeatherAlertsConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:radio';
const mockSetAttribute = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({ setAttribute: mockSetAttribute }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/lib/weatherAlerts', () => ({
  ...jest.requireActual('@/lib/weatherAlerts'),
  WEATHER_ALERTS: [
    { code: 'TOR', description: 'Tornado Warning', popular: true },
    { code: 'SVR', description: 'Severe Thunderstorm Warning', popular: true },
    { code: 'AVA', description: 'Avalanche Watch', popular: false },
    { code: 'BZW', description: 'Blizzard Warning', popular: false },
  ],
}));

// ── Helpers ───────────────────────────────────────────────────────────

const UPDATE_FAILED = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to update weather alerts' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockDevice = makeDevice(ADDR, { [WeatherRadio.ATTR_ALERTSOFINTEREST]: ['TOR', 'BZW'] });
  mockSetAttribute.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('NoaaWeatherAlertsConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<NoaaWeatherAlertsConfigurator address={ADDR} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('groups subscribed, popular and other alerts', () => {
    render(<NoaaWeatherAlertsConfigurator address={ADDR} />);
    expect(screen.getByTestId('noaa-alert-group-mine')).toHaveTextContent('Blizzard WarningTornado Warning');
    expect(screen.getByTestId('noaa-alert-group-popular')).toHaveTextContent('Severe Thunderstorm Warning');
    expect(screen.getByTestId('noaa-alert-group-more')).toHaveTextContent('Avalanche Watch');
    expect(screen.getByTestId('noaa-alert-TOR')).toBeChecked();
    expect(screen.getByTestId('noaa-alert-SVR')).not.toBeChecked();
  });

  it('subscribes to an alert', async () => {
    render(<NoaaWeatherAlertsConfigurator address={ADDR} />);
    fireEvent.click(screen.getByTestId('noaa-alert-SVR'));

    await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(
      WeatherRadio.ATTR_ALERTSOFINTEREST, ['TOR', 'BZW', 'SVR'],
    ));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('unsubscribes from an alert', async () => {
    render(<NoaaWeatherAlertsConfigurator address={ADDR} />);
    fireEvent.click(screen.getByTestId('noaa-alert-TOR'));

    await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(WeatherRadio.ATTR_ALERTSOFINTEREST, ['BZW']));
  });

  it('disables the checkboxes while saving', async () => {
    mockSetAttribute.mockReturnValueOnce(new Promise(() => {}));
    render(<NoaaWeatherAlertsConfigurator address={ADDR} />);
    fireEvent.click(screen.getByTestId('noaa-alert-SVR'));

    await waitFor(() => expect(screen.getByTestId('noaa-alert-AVA')).toBeDisabled());
  });

  it('shows an error when saving fails', async () => {
    mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
    render(<NoaaWeatherAlertsConfigurator address={ADDR} />);
    fireEvent.click(screen.getByTestId('noaa-alert-SVR'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(UPDATE_FAILED));
    await waitFor(() => expect(screen.getByTestId('noaa-alert-SVR')).not.toBeDisabled());
  });

  it('treats a device without alerts of interest as subscribed to none', async () => {
    mockDevice = makeDevice(ADDR);
    render(<NoaaWeatherAlertsConfigurator address={ADDR} />);
    expect(screen.getByTestId('noaa-alert-group-empty-mine')).toHaveTextContent('None');

    fireEvent.click(screen.getByTestId('noaa-alert-TOR'));
    await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(WeatherRadio.ATTR_ALERTSOFINTEREST, ['TOR']));
  });

  it('shows an empty popular group when every popular alert is subscribed', () => {
    mockDevice = makeDevice(ADDR, { [WeatherRadio.ATTR_ALERTSOFINTEREST]: ['TOR', 'SVR'] });
    render(<NoaaWeatherAlertsConfigurator address={ADDR} />);
    expect(screen.getByTestId('noaa-alert-group-empty-popular')).toBeInTheDocument();
  });
});
