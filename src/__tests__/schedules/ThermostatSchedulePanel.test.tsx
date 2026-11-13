import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, ClimateSubsystem, Device, Thermostat } from '@arcus/core';
import { ThermostatSchedulePanel } from '@/components/schedules/ThermostatSchedulePanel';
import type { ScheduleAttributeEditorRenderer, ScheduledCommand } from '@/components/schedules/types';
import { makeDevice, makeSubsystem } from '../helpers/factories';
import type { DeviceEntity, SubsystemEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const THERM = 'DRIV:dev:therm-1';
const CLIMATE = 'SERV:subclimate:place-1';

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
let mockDevice: DeviceEntity | undefined;
let mockClimate: SubsystemEntity | undefined;
let mockStatus = { enabled: true, eventCount: 2 };

interface CapturedPanelProps {
  targetAddress: string;
  targetName: string;
  scheduleId: string;
  messageType: string;
  modes: string[];
  modeLabels: { [mode: string]: string };
  defaultAttributes: { [attr: string]: number };
  renderAttributeEditor: ScheduleAttributeEditorRenderer;
  describeEvent: (command: ScheduledCommand) => string;
}
let mockPanelProps: CapturedPanelProps | undefined;

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

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: () => mockClimate,
}));

jest.mock('@/hooks/useThermostatScheduleStatus', () => ({
  useThermostatScheduleStatus: () => mockStatus,
}));

// Stub the shared schedule panel; it has its own tests. Render the attribute
// editor it is handed so the setpoint wiring is exercised.
jest.mock('@/components/schedules/ScheduleEditPanel', () => ({
  ScheduleEditPanel: (props: CapturedPanelProps) => {
    mockPanelProps = props;
    return (
      <div data-testid="schedule-edit-panel">
        {props.renderAttributeEditor({
          scheduleId: props.scheduleId,
          attributes: props.defaultAttributes,
          onChange: () => {},
        })}
      </div>
    );
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const thermostat = (overrides: Partial<DeviceEntity> = {}) => makeDevice(THERM, {
  [Device.ATTR_NAME]: 'Hallway Thermostat',
  [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_COOL,
  [Thermostat.ATTR_HEATSETPOINT]: 20,
  [Thermostat.ATTR_COOLSETPOINT]: 25,
  [Thermostat.ATTR_SUPPORTEDMODES]: ['OFF', 'HEAT', 'COOL', 'AUTO'],
  ...overrides,
});

const toast = (type: string, message: string) => ({ type: 'ui/addNotification', payload: { type, message } });

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockDevice = thermostat();
  mockClimate = makeSubsystem(CLIMATE);
  mockStatus = { enabled: true, eventCount: 2 };
  mockPanelProps = undefined;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ThermostatSchedulePanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ThermostatSchedulePanel address={THERM} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('opens the schedule panel on the thermostat with its HVAC programs', () => {
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(mockPanelProps).toMatchObject({
        targetAddress: THERM,
        targetName: 'Hallway Thermostat',
        scheduleId: Thermostat.HVACMODE_COOL,
        messageType: Base.CMD_SETATTRIBUTES,
        modes: [Thermostat.HVACMODE_HEAT, Thermostat.HVACMODE_COOL, Thermostat.HVACMODE_AUTO],
        modeLabels: { HEAT: 'Heat', COOL: 'Cool', AUTO: 'Auto' },
        defaultAttributes: { [Thermostat.ATTR_HEATSETPOINT]: 20, [Thermostat.ATTR_COOLSETPOINT]: 25 },
      });
    });

    it('describes events by their setpoints', () => {
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(mockPanelProps?.describeEvent({
        scheduleId: Thermostat.HVACMODE_COOL,
        attributes: { [Thermostat.ATTR_COOLSETPOINT]: 25 },
      })).toBe('Cool 77°');
    });

    it('hands the panel a setpoint editor for the active mode', () => {
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(screen.getByTestId('thermostat-schedule-cool-value')).toHaveTextContent('77°');
      expect(screen.queryByTestId('thermostat-schedule-heat-value')).not.toBeInTheDocument();
    });

    it('shows the follow switch on when the schedule is followed', () => {
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(screen.getByTestId('thermostat-schedule-follow')).toHaveAttribute('aria-checked', 'true');
      expect(screen.queryByTestId('thermostat-schedule-off')).not.toBeInTheDocument();
    });

    it('warns when the schedule is not followed', () => {
      mockStatus = { enabled: false, eventCount: 2 };
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(screen.getByTestId('thermostat-schedule-follow')).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByTestId('thermostat-schedule-off')).toBeInTheDocument();
    });
  });

  describe('follow schedule', () => {
    it('enables the scheduler through the climate subsystem', async () => {
      mockStatus = { enabled: false, eventCount: 2 };
      render(<ThermostatSchedulePanel address={THERM} />);
      fireEvent.click(screen.getByTestId('thermostat-schedule-follow'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        ClimateSubsystem.CMD_ENABLESCHEDULER, CLIMATE, { thermostat: THERM },
      ));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('disables the scheduler', async () => {
      render(<ThermostatSchedulePanel address={THERM} />);
      fireEvent.click(screen.getByTestId('thermostat-schedule-follow'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        ClimateSubsystem.CMD_DISABLESCHEDULER, CLIMATE, { thermostat: THERM },
      ));
    });

    it('disables the switch while the request is in flight', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<ThermostatSchedulePanel address={THERM} />);
      fireEvent.click(screen.getByTestId('thermostat-schedule-follow'));
      await waitFor(() => expect(screen.getByTestId('thermostat-schedule-follow')).toBeDisabled());
    });

    it('shows an error when the request fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<ThermostatSchedulePanel address={THERM} />);
      fireEvent.click(screen.getByTestId('thermostat-schedule-follow'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
        toast('error', 'Failed to turn off the schedule.'),
      ));
      expect(screen.getByTestId('thermostat-schedule-follow')).toBeEnabled();
    });

    it('explains when the place has no time zone', async () => {
      mockStatus = { enabled: false, eventCount: 2 };
      mockBridgeRequest.mockRejectedValueOnce({ code: 'timezone.notset' });
      render(<ThermostatSchedulePanel address={THERM} />);
      fireEvent.click(screen.getByTestId('thermostat-schedule-follow'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
        toast('error', 'Set a time zone for this place before turning on the schedule.'),
      ));
    });

    it('shows an error without a climate subsystem', () => {
      mockClimate = undefined;
      render(<ThermostatSchedulePanel address={THERM} />);
      fireEvent.click(screen.getByTestId('thermostat-schedule-follow'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(toast('error', 'Climate service is unavailable.'));
    });
  });

  describe('edge cases', () => {
    it('shows a message when the thermostat is gone', () => {
      mockDevice = undefined;
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(screen.getByTestId('thermostat-schedule-missing')).toBeInTheDocument();
      expect(screen.queryByTestId('schedule-edit-panel')).not.toBeInTheDocument();
    });

    it('starts on Heat when the thermostat is off', () => {
      mockDevice = thermostat({ [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_OFF });
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(mockPanelProps?.scheduleId).toBe(Thermostat.HVACMODE_HEAT);
    });

    it('only offers the supported modes', () => {
      mockDevice = thermostat({
        [Thermostat.ATTR_SUPPORTEDMODES]: ['OFF', 'COOL'],
        [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_OFF,
      });
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(mockPanelProps?.modes).toEqual([Thermostat.HVACMODE_COOL]);
      expect(mockPanelProps?.scheduleId).toBe(Thermostat.HVACMODE_COOL);
    });

    it('falls back to a generic name', () => {
      mockDevice = thermostat({ [Device.ATTR_NAME]: undefined });
      render(<ThermostatSchedulePanel address={THERM} />);
      expect(mockPanelProps?.targetName).toBe('Thermostat');
    });
  });
});
