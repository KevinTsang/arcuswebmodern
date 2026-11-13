import { render, screen } from '@testing-library/react';
import { Place } from '@arcus/core';
import { WeatherAlertList } from '@/components/weather/WeatherAlertList';
import type { WeatherRadioStatus } from '@/hooks/useWeatherSubsystem';
import type { PlaceData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockPlace: Partial<PlaceData> | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: { place: { place: Partial<PlaceData> | null } }) => unknown) =>
    sel({ place: { place: mockPlace } }),
}));

jest.mock('@/lib/weatherAlerts', () => ({
  ...jest.requireActual('@/lib/weatherAlerts'),
  formatWeatherAlertTime: (ts: number | undefined) => (ts ? `time:${ts}` : 'Unknown time'),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeRadio(overrides: Partial<WeatherRadioStatus> = {}): WeatherRadioStatus {
  return {
    address: 'DRIV:dev:r1',
    name: 'Kitchen Halo',
    alertState: 'ALERT',
    playingState: 'PLAYING',
    currentAlert: 'TOR',
    lastAlertTime: 1000,
    stationSelected: 1,
    frequency: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPlace = { [Place.ATTR_ADDRCOUNTY]: 'Travis', [Place.ATTR_STATE]: 'TX' };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WeatherAlertList', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WeatherAlertList radios={[makeRadio()]} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the alert, time, radio and location', () => {
    render(<WeatherAlertList radios={[makeRadio()]} />);
    expect(screen.getByText('Tornado Warning Issued')).toBeInTheDocument();
    expect(screen.getByTestId('weather-alert-time-DRIV:dev:r1')).toHaveTextContent('time:1000');
    expect(screen.getByText('Kitchen Halo')).toBeInTheDocument();
    expect(screen.getByTestId('weather-alert-location-DRIV:dev:r1')).toHaveTextContent('Travis County, TX');
  });

  it('renders one entry per radio', () => {
    render(
      <WeatherAlertList
        radios={[makeRadio(), makeRadio({ address: 'DRIV:dev:r2', name: 'Bedroom', currentAlert: 'WSW' })]}
      />,
    );
    expect(screen.getByTestId('weather-alert-DRIV:dev:r1')).toBeInTheDocument();
    expect(screen.getByTestId('weather-alert-DRIV:dev:r2')).toHaveTextContent('Winter Storm Warning Issued');
  });

  it('shows an empty message without alerting radios', () => {
    render(<WeatherAlertList radios={[]} />);
    expect(screen.getByTestId('weather-alert-list-empty')).toHaveTextContent('No active weather alerts.');
  });

  it('falls back to stateProv when place:state is missing', () => {
    mockPlace = { [Place.ATTR_STATEPROV]: 'CA' };
    render(<WeatherAlertList radios={[makeRadio()]} />);
    expect(screen.getByTestId('weather-alert-location-DRIV:dev:r1')).toHaveTextContent('CA');
  });

  it('omits the location without place data', () => {
    mockPlace = null;
    render(<WeatherAlertList radios={[makeRadio({ lastAlertTime: undefined })]} />);
    expect(screen.queryByTestId('weather-alert-location-DRIV:dev:r1')).not.toBeInTheDocument();
    expect(screen.getByTestId('weather-alert-time-DRIV:dev:r1')).toHaveTextContent('Unknown time');
  });
});
