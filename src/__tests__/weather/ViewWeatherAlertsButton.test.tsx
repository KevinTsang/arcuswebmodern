import { render, screen, fireEvent } from '@testing-library/react';
import { isValidElement, type ReactElement } from 'react';
import { ViewWeatherAlertsButton } from '@/components/weather/ViewWeatherAlertsButton';
import { WeatherAlertsPanel } from '@/components/weather/WeatherAlertsPanel';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/components/weather/WeatherAlertsPanel', () => ({
  WeatherAlertsPanel: () => <div>panel</div>,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ViewWeatherAlertsButton', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ViewWeatherAlertsButton />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders the button label', () => {
    render(<ViewWeatherAlertsButton />);
    expect(screen.getByRole('button', { name: 'View or snooze alerts' })).toBeInTheDocument();
  });

  it('opens the weather alerts panel', () => {
    render(<ViewWeatherAlertsButton />);
    fireEvent.click(screen.getByTestId('weather-view-alerts'));

    expect(mockOpenRight).toHaveBeenCalledTimes(1);
    const [content, options] = mockOpenRight.mock.calls[0] as [ReactElement, { title: string; key: string }];
    expect(isValidElement(content) && content.type).toBe(WeatherAlertsPanel);
    expect(options).toEqual({ title: 'Weather Alerts', key: 'weather-alerts' });
  });
});
