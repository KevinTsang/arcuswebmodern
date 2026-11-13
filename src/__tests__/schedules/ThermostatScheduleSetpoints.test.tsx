import { render, screen, fireEvent } from '@testing-library/react';
import { Thermostat } from '@arcus/core';
import { ThermostatScheduleSetpoints } from '@/components/schedules/ThermostatScheduleSetpoints';
import { celsiusToFahrenheit, fahrenheitToCelsius } from '@/lib/thermostatSchedule';
import type { ScheduleAttributes } from '@/components/schedules/types';

// ── Helpers ───────────────────────────────────────────────────────────

const limits = { minF: 45, maxF: 95, separationF: 3 };
const onChange = jest.fn();

const attrs = (heatF: number, coolF: number): ScheduleAttributes => ({
  [Thermostat.ATTR_HEATSETPOINT]: fahrenheitToCelsius(heatF),
  [Thermostat.ATTR_COOLSETPOINT]: fahrenheitToCelsius(coolF),
});

function renderSetpoints(scheduleId: string, attributes: ScheduleAttributes = attrs(68, 78)) {
  return render(
    <ThermostatScheduleSetpoints
      scheduleId={scheduleId}
      attributes={attributes}
      onChange={onChange}
      limits={limits}
    />,
  );
}

/** The last attributes passed to onChange, as whole °F. */
function lastChangeF(attribute: string): number {
  const next = onChange.mock.calls.at(-1)[0] as ScheduleAttributes;
  return celsiusToFahrenheit(next[attribute] as number);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ThermostatScheduleSetpoints', () => {
  it('matches snapshot in AUTO mode', () => {
    const { asFragment } = renderSetpoints(Thermostat.HVACMODE_AUTO);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows only the heat setpoint for HEAT', () => {
      renderSetpoints(Thermostat.HVACMODE_HEAT);
      expect(screen.getByText('Heat Set Point')).toBeInTheDocument();
      expect(screen.getByTestId('thermostat-schedule-heat-value')).toHaveTextContent('68°');
      expect(screen.queryByTestId('thermostat-schedule-cool-value')).not.toBeInTheDocument();
      expect(screen.queryByTestId('thermostat-schedule-separation')).not.toBeInTheDocument();
    });

    it('shows only the cool setpoint for COOL', () => {
      renderSetpoints(Thermostat.HVACMODE_COOL);
      expect(screen.getByText('Cool Set Point')).toBeInTheDocument();
      expect(screen.getByTestId('thermostat-schedule-cool-value')).toHaveTextContent('78°');
      expect(screen.queryByTestId('thermostat-schedule-heat-value')).not.toBeInTheDocument();
    });

    it('shows both setpoints and the separation note for AUTO', () => {
      renderSetpoints(Thermostat.HVACMODE_AUTO);
      expect(screen.getByText('Temperature Range')).toBeInTheDocument();
      expect(screen.getByText('Heat To')).toBeInTheDocument();
      expect(screen.getByText('Cool To')).toBeInTheDocument();
      expect(screen.getByTestId('thermostat-schedule-separation')).toHaveTextContent('at least 3° apart');
    });

    it('renders nothing for a non-thermostat schedule', () => {
      renderSetpoints('FIRE');
      expect(screen.queryByTestId('thermostat-schedule-setpoints')).not.toBeInTheDocument();
    });

    it('falls back to 68 °F / 78 °F when attributes are missing', () => {
      renderSetpoints(Thermostat.HVACMODE_AUTO, {});
      expect(screen.getByTestId('thermostat-schedule-heat-value')).toHaveTextContent('68°');
      expect(screen.getByTestId('thermostat-schedule-cool-value')).toHaveTextContent('78°');
    });
  });

  describe('interactions', () => {
    it('raises the heat setpoint, keeping other attributes', () => {
      renderSetpoints(Thermostat.HVACMODE_HEAT, { ...attrs(68, 78), 'other:attr': 'x' });
      fireEvent.click(screen.getByTestId('thermostat-schedule-heat-up'));
      expect(lastChangeF(Thermostat.ATTR_HEATSETPOINT)).toBe(69);
      expect(onChange.mock.calls[0][0]).toMatchObject({ 'other:attr': 'x' });
      expect(lastChangeF(Thermostat.ATTR_COOLSETPOINT)).toBe(78);
    });

    it('lowers the cool setpoint', () => {
      renderSetpoints(Thermostat.HVACMODE_COOL);
      fireEvent.click(screen.getByTestId('thermostat-schedule-cool-down'));
      expect(lastChangeF(Thermostat.ATTR_COOLSETPOINT)).toBe(77);
    });

    it('lowers the heat and raises the cool setpoint', () => {
      renderSetpoints(Thermostat.HVACMODE_AUTO);
      fireEvent.click(screen.getByTestId('thermostat-schedule-heat-down'));
      expect(lastChangeF(Thermostat.ATTR_HEATSETPOINT)).toBe(67);
      fireEvent.click(screen.getByTestId('thermostat-schedule-cool-up'));
      expect(lastChangeF(Thermostat.ATTR_COOLSETPOINT)).toBe(79);
    });
  });

  describe('limits', () => {
    it('stops at the minimum and maximum', () => {
      renderSetpoints(Thermostat.HVACMODE_HEAT, attrs(45, 95));
      expect(screen.getByTestId('thermostat-schedule-heat-down')).toBeDisabled();
      fireEvent.click(screen.getByTestId('thermostat-schedule-heat-down'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('stops the cool setpoint at the maximum', () => {
      renderSetpoints(Thermostat.HVACMODE_COOL, attrs(68, 95));
      expect(screen.getByTestId('thermostat-schedule-cool-up')).toBeDisabled();
      expect(screen.getByTestId('thermostat-schedule-cool-down')).toBeEnabled();
    });

    it('keeps the AUTO setpoints separated', () => {
      renderSetpoints(Thermostat.HVACMODE_AUTO, attrs(70, 73));
      expect(screen.getByTestId('thermostat-schedule-heat-up')).toBeDisabled();
      expect(screen.getByTestId('thermostat-schedule-cool-down')).toBeDisabled();
      expect(screen.getByTestId('thermostat-schedule-heat-down')).toBeEnabled();
      expect(screen.getByTestId('thermostat-schedule-cool-up')).toBeEnabled();
    });

    it('allows setpoints that are not separated in HEAT mode', () => {
      renderSetpoints(Thermostat.HVACMODE_HEAT, attrs(70, 71));
      expect(screen.getByTestId('thermostat-schedule-heat-up')).toBeEnabled();
    });

    it('brings an out-of-range setpoint back within limits', () => {
      renderSetpoints(Thermostat.HVACMODE_HEAT, attrs(99, 78));
      fireEvent.click(screen.getByTestId('thermostat-schedule-heat-down'));
      expect(lastChangeF(Thermostat.ATTR_HEATSETPOINT)).toBe(95);
    });

    it('raises a setpoint below the minimum to the minimum', () => {
      renderSetpoints(Thermostat.HVACMODE_COOL, attrs(68, 40));
      fireEvent.click(screen.getByTestId('thermostat-schedule-cool-up'));
      expect(lastChangeF(Thermostat.ATTR_COOLSETPOINT)).toBe(45);
    });
  });
});
