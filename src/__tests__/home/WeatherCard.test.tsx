import { render, screen } from '@testing-library/react';
import { WeatherRadio } from '@arcus/core';
import WeatherCard from '@/components/home/WeatherCard';
import type { WeatherRadioStatus, WeatherSubsystemState } from '@/hooks/useWeatherSubsystem';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockWeather: WeatherSubsystemState;

jest.mock('@/hooks/useWeatherSubsystem', () => ({
  useWeatherSubsystem: () => mockWeather,
}));

jest.mock('@/components/weather/ViewWeatherAlertsButton', () => ({
  ViewWeatherAlertsButton: () => <button data-testid="weather-view-alerts">View</button>,
}));

jest.mock('@/lib/weatherAlerts', () => ({
  ...jest.requireActual('@/lib/weatherAlerts'),
  formatWeatherAlertTime: (ts: number | undefined) => (ts ? `time:${ts}` : 'Unknown time'),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeRadio(address: string, overrides: Partial<WeatherRadioStatus> = {}): WeatherRadioStatus {
  return {
    address,
    name: `Radio ${address}`,
    alertState: WeatherRadio.ALERTSTATE_NO_ALERT,
    playingState: WeatherRadio.PLAYINGSTATE_QUIET,
    currentAlert: 'NONE',
    lastAlertTime: undefined,
    stationSelected: 1,
    frequency: undefined,
    ...overrides,
  };
}

function weather(radios: WeatherRadioStatus[], overrides: Partial<WeatherSubsystemState> = {}): WeatherSubsystemState {
  const alertingRadios = radios.filter((r) => r.alertState === WeatherRadio.ALERTSTATE_ALERT);
  return {
    address: 'SERV:subweather:place-1',
    radios,
    alertingRadios,
    alertActive: alertingRadios.length > 0,
    lastAlertTime: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  mockWeather = weather([makeRadio('DRIV:dev:r1')]);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WeatherCard', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WeatherCard />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows All Clear, radio count and no last alert when quiet', () => {
    render(<WeatherCard />);
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getByTestId('status-value-weather-status')).toHaveTextContent('All Clear');
    expect(screen.getByTestId('status-value-weather-radios')).toHaveTextContent('1');
    expect(screen.getByTestId('status-value-weather-last-alert')).toHaveTextContent('None');
    expect(screen.getByTestId('weather-radio-status-DRIV:dev:r1')).toHaveTextContent('No alerts');
    expect(screen.queryByTestId('weather-view-alerts')).not.toBeInTheDocument();
  });

  it('shows the alert and the view button when a radio is alerting', () => {
    mockWeather = weather(
      [makeRadio('DRIV:dev:r1', { alertState: WeatherRadio.ALERTSTATE_ALERT, currentAlert: 'TOR' })],
      { lastAlertTime: 500 },
    );
    render(<WeatherCard />);
    expect(screen.getByTestId('status-value-weather-status')).toHaveTextContent('Alert');
    expect(screen.getByTestId('status-value-weather-last-alert')).toHaveTextContent('time:500');
    expect(screen.getByTestId('weather-radio-status-DRIV:dev:r1')).toHaveTextContent('Tornado Warning');
    expect(screen.getByTestId('weather-view-alerts')).toBeInTheDocument();
  });

  it('describes hushed and playing radios', () => {
    mockWeather = weather([
      makeRadio('DRIV:dev:r1', { alertState: WeatherRadio.ALERTSTATE_HUSHED }),
      makeRadio('DRIV:dev:r2', { playingState: WeatherRadio.PLAYINGSTATE_PLAYING }),
    ]);
    render(<WeatherCard />);
    expect(screen.getByTestId('weather-radio-status-DRIV:dev:r1')).toHaveTextContent('Alert snoozed');
    expect(screen.getByTestId('weather-radio-status-DRIV:dev:r2')).toHaveTextContent('Playing station');
    expect(screen.getByTestId('status-value-weather-radios')).toHaveTextContent('2');
  });

  it('renders nothing without weather radios', () => {
    mockWeather = weather([]);
    const { container } = render(<WeatherCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
