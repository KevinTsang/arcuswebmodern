import { render, screen, fireEvent } from '@testing-library/react';
import { isValidElement, type ReactElement } from 'react';
import { WeatherAlertBanner } from '@/components/weather/WeatherAlertBanner';
import { WeatherAlertsPanel } from '@/components/weather/WeatherAlertsPanel';
import type { WeatherRadioStatus, WeatherSubsystemState } from '@/hooks/useWeatherSubsystem';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
let mockWeather: WeatherSubsystemState;

jest.mock('@/hooks/useWeatherSubsystem', () => ({
  useWeatherSubsystem: () => mockWeather,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/components/weather/WeatherAlertsPanel', () => ({
  WeatherAlertsPanel: () => <div>panel</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeRadio(address: string, currentAlert: string): WeatherRadioStatus {
  return {
    address,
    name: address,
    alertState: 'ALERT',
    playingState: 'PLAYING',
    currentAlert,
    lastAlertTime: 1,
    stationSelected: 1,
    frequency: undefined,
  };
}

function weather(alertingRadios: WeatherRadioStatus[]): WeatherSubsystemState {
  return {
    address: 'SERV:subweather:place-1',
    radios: alertingRadios,
    alertingRadios,
    alertActive: alertingRadios.length > 0,
    lastAlertTime: undefined,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWeather = weather([makeRadio('DRIV:dev:r1', 'TOR')]);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WeatherAlertBanner', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WeatherAlertBanner />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('names the active alert', () => {
    render(<WeatherAlertBanner />);
    expect(screen.getByTestId('weather-alert-banner-label')).toHaveTextContent('Tornado Warning — Tap to view or snooze');
  });

  it('lists each distinct alert once', () => {
    mockWeather = weather([
      makeRadio('DRIV:dev:r1', 'TOR'),
      makeRadio('DRIV:dev:r2', 'TOR'),
      makeRadio('DRIV:dev:r3', 'WSW'),
    ]);
    render(<WeatherAlertBanner />);
    expect(screen.getByTestId('weather-alert-banner-label')).toHaveTextContent('Tornado Warning, Winter Storm Warning —');
  });

  it('opens the weather alerts panel when clicked', () => {
    render(<WeatherAlertBanner />);
    fireEvent.click(screen.getByTestId('weather-alert-banner'));

    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Weather Alerts', key: 'weather-alerts' });
    const content = mockOpenRight.mock.calls[0][0] as ReactElement;
    expect(isValidElement(content) && content.type).toBe(WeatherAlertsPanel);
  });

  it('renders nothing when no radio is alerting', () => {
    mockWeather = weather([]);
    const { container } = render(<WeatherAlertBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
