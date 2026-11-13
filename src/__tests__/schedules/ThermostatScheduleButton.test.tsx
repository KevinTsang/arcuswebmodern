import { render, screen, fireEvent } from '@testing-library/react';
import { ThermostatScheduleButton } from '@/components/schedules/ThermostatScheduleButton';

// ── Mocks ─────────────────────────────────────────────────────────────

const THERM = 'DRIV:dev:therm-1';
const mockOpenRight = jest.fn();
let mockStatus = { enabled: true, eventCount: 3 };

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/hooks/useThermostatScheduleStatus', () => ({
  useThermostatScheduleStatus: () => mockStatus,
}));

jest.mock('@/components/schedules/ThermostatSchedulePanel', () => ({
  ThermostatSchedulePanel: ({ address }: { address: string }) => <div data-testid="thermostat-panel">{address}</div>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = { enabled: true, eventCount: 3 };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ThermostatScheduleButton', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ThermostatScheduleButton address={THERM} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows a followed schedule with its event count', () => {
      render(<ThermostatScheduleButton address={THERM} />);
      expect(screen.getByTestId(`thermostat-schedule-status-${THERM}`)).toHaveTextContent('On · 3 events');
      expect(screen.getByTestId(`thermostat-schedule-open-${THERM}`)).toHaveTextContent('Edit Schedule');
    });

    it('shows a schedule that is off', () => {
      mockStatus = { enabled: false, eventCount: 1 };
      render(<ThermostatScheduleButton address={THERM} />);
      expect(screen.getByTestId(`thermostat-schedule-status-${THERM}`)).toHaveTextContent('Off · 1 event');
    });

    it('invites setting up a schedule when there are no events', () => {
      mockStatus = { enabled: false, eventCount: 0 };
      render(<ThermostatScheduleButton address={THERM} />);
      expect(screen.getByTestId(`thermostat-schedule-status-${THERM}`)).toHaveTextContent('No schedule');
      expect(screen.getByTestId(`thermostat-schedule-open-${THERM}`)).toHaveTextContent('Set Up Schedule');
    });
  });

  describe('interactions', () => {
    it('opens the thermostat schedule in the right panel', () => {
      render(<ThermostatScheduleButton address={THERM} />);
      fireEvent.click(screen.getByTestId(`thermostat-schedule-open-${THERM}`));
      expect(mockOpenRight).toHaveBeenCalledWith(
        expect.objectContaining({ props: { address: THERM } }),
        { title: 'Schedule', key: `thermostat-schedule:${THERM}` },
      );
    });
  });
});
