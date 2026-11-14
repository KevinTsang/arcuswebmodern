import { render, screen } from '@testing-library/react';
import { ClimateSubsystem } from '@arcus/core';
import { ClimateView } from '@/components/subsystems/ClimateView';
import { makeDevice, makeSubsystem } from '../helpers/factories';
import type { DeviceEntity, SubsystemEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const THERM = 'DRIV:dev:therm-1';
const FAN = 'DRIV:dev:fan-1';
const SENSOR = 'DRIV:dev:sensor-1';

interface ClimateState {
  subsystem: SubsystemEntity | undefined;
  temperature: number | undefined;
  humidity: number | undefined;
  controlDevices: DeviceEntity[];
  tempDevices: DeviceEntity[];
  humidDevices: DeviceEntity[];
}
let mockClimate: ClimateState;

jest.mock('@/hooks/useClimateSubsystem', () => ({
  useClimateSubsystem: () => mockClimate,
}));

jest.mock('@/components/devices', () => ({
  DevicePanel: ({ address }: { address: string }) => <div data-testid={`device-panel-${address}`} />,
}));

jest.mock('@/components/schedules/ThermostatScheduleButton', () => ({
  ThermostatScheduleButton: ({ address }: { address: string }) => (
    <div data-testid={`thermostat-schedule-button-${address}`} />
  ),
}));

beforeEach(() => {
  const therm = makeDevice(THERM);
  mockClimate = {
    subsystem: makeSubsystem('SERV:subclimate:p', { [ClimateSubsystem.ATTR_THERMOSTATS]: [THERM] }),
    temperature: 22,
    humidity: 41.4,
    controlDevices: [therm, makeDevice(FAN)],
    tempDevices: [therm, makeDevice(SENSOR), makeDevice('DRIV:dev:sensor-2')],
    humidDevices: [therm],
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ClimateView', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ClimateView />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows readings and devices', () => {
    render(<ClimateView />);
    expect(screen.getByTestId('climate-temperature')).toHaveTextContent('72°F');
    expect(screen.getByTestId('climate-humidity')).toHaveTextContent('41%');
    expect(screen.getByTestId(`device-panel-${THERM}`)).toBeInTheDocument();
    expect(screen.getByTestId(`device-panel-${SENSOR}`)).toBeInTheDocument();
  });

  it('offers a schedule only for thermostats', () => {
    render(<ClimateView />);
    expect(screen.getByTestId(`thermostat-schedule-button-${THERM}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`thermostat-schedule-button-${FAN}`)).not.toBeInTheDocument();
  });

  it('offers no schedules without the subsystem thermostat list', () => {
    mockClimate.subsystem = undefined;
    render(<ClimateView />);
    expect(screen.queryByTestId(`thermostat-schedule-button-${THERM}`)).not.toBeInTheDocument();
  });

  it('shows the empty state without climate devices', () => {
    mockClimate = { ...mockClimate, controlDevices: [], tempDevices: [], humidDevices: [] };
    render(<ClimateView />);
    expect(screen.getByTestId('climate-empty')).toBeInTheDocument();
  });
});
