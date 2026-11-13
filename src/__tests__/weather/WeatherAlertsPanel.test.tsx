import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeatherSubsystem } from '@arcus/core';
import { WeatherAlertsPanel } from '@/components/weather/WeatherAlertsPanel';
import type { WeatherRadioStatus, WeatherSubsystemState } from '@/hooks/useWeatherSubsystem';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
const mockCloseRight = jest.fn();
let mockWeather: WeatherSubsystemState;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/hooks/useWeatherSubsystem', () => ({
  useWeatherSubsystem: () => mockWeather,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/components/weather/WeatherAlertList', () => ({
  WeatherAlertList: ({ radios }: { radios: WeatherRadioStatus[] }) => (
    <div data-testid="alert-list">{radios.map((r) => r.name).join(',')}</div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SUB_ADDR = 'SERV:subweather:place-1';

function makeRadio(address: string): WeatherRadioStatus {
  return {
    address,
    name: `Radio ${address}`,
    alertState: 'ALERT',
    playingState: 'PLAYING',
    currentAlert: 'TOR',
    lastAlertTime: 1,
    stationSelected: 1,
    frequency: undefined,
  };
}

function weather(overrides: Partial<WeatherSubsystemState> = {}): WeatherSubsystemState {
  const radios = [makeRadio('DRIV:dev:r1')];
  return {
    address: SUB_ADDR,
    radios,
    alertingRadios: radios,
    alertActive: true,
    lastAlertTime: 1,
    ...overrides,
  };
}

const SNOOZED = { type: 'ui/addNotification', payload: { type: 'success', message: 'Weather alerts snoozed' } };
const SNOOZE_FAILED = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to snooze weather alerts' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockWeather = weather();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WeatherAlertsPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WeatherAlertsPanel />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders the alerting radios and the snooze button', () => {
    render(<WeatherAlertsPanel />);
    expect(screen.getByText('Weather Radio Alert')).toBeInTheDocument();
    expect(screen.getByTestId('alert-list')).toHaveTextContent('Radio DRIV:dev:r1');
    expect(screen.getByTestId('weather-alerts-snooze')).toHaveTextContent('Snooze');
  });

  it('snoozes all alerts through the subsystem and closes the panel', async () => {
    render(<WeatherAlertsPanel />);
    fireEvent.click(screen.getByTestId('weather-alerts-snooze'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(WeatherSubsystem.CMD_SNOOZEALLALERTS, SUB_ADDR, {});
    expect(mockDispatch).toHaveBeenCalledWith(SNOOZED);
  });

  it('shows the in-flight state while snoozing', async () => {
    mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
    render(<WeatherAlertsPanel />);
    fireEvent.click(screen.getByTestId('weather-alerts-snooze'));

    await waitFor(() => expect(screen.getByTestId('weather-alerts-snooze')).toBeDisabled());
    expect(screen.getByTestId('weather-alerts-snooze')).toHaveTextContent('Snoozing…');
  });

  it('shows an error and keeps the panel open when snoozing fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<WeatherAlertsPanel />);
    fireEvent.click(screen.getByTestId('weather-alerts-snooze'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(SNOOZE_FAILED));
    expect(mockCloseRight).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('weather-alerts-snooze')).not.toBeDisabled());
  });

  it('hides the snooze controls when nothing is alerting', () => {
    mockWeather = weather({ alertingRadios: [], alertActive: false });
    render(<WeatherAlertsPanel />);
    expect(screen.queryByTestId('weather-alerts-snooze')).not.toBeInTheDocument();
  });

  it('disables snooze without a subsystem address', () => {
    mockWeather = weather({ address: undefined });
    render(<WeatherAlertsPanel />);
    const button = screen.getByTestId('weather-alerts-snooze');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});
