import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Device, DeviceConnection, SecuritySubsystem, AlarmIncident } from '@arcus/core';
import { AlarmStatus } from '@/components/subsystems/AlarmStatus';
import type { DeviceEntity, IncidentEntity, SubsystemEntity } from '@/store/entityTypes';
import { makeDevice, makeIncident } from '../helpers/factories';

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => any) => selector(mockState),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices,
}));

jest.mock('@/store/slices/incidentsSlice', () => ({
  selectAllIncidents: (state: any) => state.incidents,
  setCurrentIncident: (payload: unknown) => ({ type: 'incidents/setCurrentIncident', payload }),
}));

// IncidentTracker is tested separately — render a simplified stub
jest.mock('@/components/subsystems/IncidentTracker', () => ({
  __esModule: true,
  default: ({ incident }: { incident: IncidentEntity }) => (
    <div data-testid="incident-tracker">{incident[AlarmIncident.ATTR_ALERT]}</div>
  ),
}));


const defaultModeSettings = {
  ON: { devices: [], entranceDelaySec: 30, exitDelaySec: 30, soundsEnabled: true, silent: false, alarmSensitivityDeviceCount: 1 },
  PARTIAL: { devices: [], entranceDelaySec: 30, exitDelaySec: 30, soundsEnabled: true, silent: false, alarmSensitivityDeviceCount: 1 },
};

const defaultAlarm = {
  securityMode: SecuritySubsystem.ALARMMODE_OFF,
  securityState: SecuritySubsystem.ALARMSTATE_DISARMED,
  currentIncident: undefined as string | undefined,
  securityDevices: [] as string[],
  triggeredDevices: [] as string[],
  offlineDevices: [] as string[],
  callTree: [] as { person: string; enabled: boolean }[],
  modeSettings: defaultModeSettings,
  fanShutoffOnSmoke: false,
  fanShutoffOnCO: false,
  securitySubsystem: { id: 'SERV:subsecurity:abc', [Base.ATTR_ADDRESS]: 'SERV:subsecurity:abc' } as SubsystemEntity,
  safetySubsystem: undefined,
  alarmSubsystem: { id: 'SERV:subalarm:abc', [Base.ATTR_ADDRESS]: 'SERV:subalarm:abc' } as SubsystemEntity,
};

let mockAlarm = { ...defaultAlarm };
let mockState: { devices: DeviceEntity[]; incidents: IncidentEntity[] } = { devices: [], incidents: [] };

jest.mock('@/hooks/useAlarmSubsystem', () => ({
  useAlarmSubsystem: () => mockAlarm,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarm = { ...defaultAlarm };
  mockState = { devices: [], incidents: [] };
});

describe('AlarmStatus', () => {
  // ── State display ───────────────────────────────────────────────────
  it('shows Disarmed state by default', () => {
    render(<AlarmStatus />);
    expect(screen.getByText('Disarmed')).toBeInTheDocument();
  });

  it('shows Armed state', () => {
    mockAlarm = { ...defaultAlarm, securityState: SecuritySubsystem.ALARMSTATE_ARMED };
    render(<AlarmStatus />);
    expect(screen.getByText('Armed')).toBeInTheDocument();
  });

  it('shows ALERT! state', () => {
    mockAlarm = { ...defaultAlarm, securityState: SecuritySubsystem.ALARMSTATE_ALERT };
    render(<AlarmStatus />);
    expect(screen.getByText('ALERT!')).toBeInTheDocument();
  });

  it('shows Full mode label when ALARMMODE_ON', () => {
    mockAlarm = { ...defaultAlarm, securityMode: SecuritySubsystem.ALARMMODE_ON };
    render(<AlarmStatus />);
    const modeLabel = screen.getByText('Disarmed').closest('div')!.parentElement!.querySelector('.text-grouse');
    expect(modeLabel?.textContent).toMatch(/Full/);
  });

  it('shows Partial mode label when ALARMMODE_PARTIAL', () => {
    mockAlarm = { ...defaultAlarm, securityMode: SecuritySubsystem.ALARMMODE_PARTIAL };
    render(<AlarmStatus />);
    const modeLabel = screen.getByText('Disarmed').closest('div')!.parentElement!.querySelector('.text-grouse');
    expect(modeLabel?.textContent).toMatch(/Partial/);
  });

  // ── Arm/Disarm controls ─────────────────────────────────────────────
  it('shows Arm buttons when disarmed', () => {
    render(<AlarmStatus />);
    expect(screen.getByText('Arm (Full)')).toBeInTheDocument();
    expect(screen.getByText('Arm (Partial)')).toBeInTheDocument();
    expect(screen.queryByText('Disarm')).not.toBeInTheDocument();
  });

  it('shows Disarm button when armed', () => {
    mockAlarm = { ...defaultAlarm, securityState: SecuritySubsystem.ALARMSTATE_ARMED };
    render(<AlarmStatus />);
    expect(screen.getByText('Disarm')).toBeInTheDocument();
    expect(screen.queryByText('Arm (Full)')).not.toBeInTheDocument();
  });

  it('sends subsecurity:Arm with ON mode on Arm (Full) click', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Arm (Full)'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        SecuritySubsystem.CMD_ARM,
        'SERV:subsecurity:abc',
        { mode: 'ON' },
      );
    });
  });

  it('sends subsecurity:Arm with PARTIAL mode on Arm (Partial) click', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Arm (Partial)'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        SecuritySubsystem.CMD_ARM,
        'SERV:subsecurity:abc',
        { mode: 'PARTIAL' },
      );
    });
  });

  it('dispatches success notification after arm', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Arm (Full)'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Alarm armed' },
      });
    });
  });

  it('dispatches partially armed notification', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Arm (Partial)'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Alarm partially armed' },
      });
    });
  });

  it('dispatches error notification on arm failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Arm (Full)'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to arm alarm' },
      });
    });
  });

  it('sends subsecurity:Disarm on Disarm click', async () => {
    mockAlarm = { ...defaultAlarm, securityState: SecuritySubsystem.ALARMSTATE_ARMED };
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Disarm'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        SecuritySubsystem.CMD_DISARM,
        'SERV:subsecurity:abc',
        {},
      );
    });
  });

  it('dispatches success notification after disarm', async () => {
    mockAlarm = { ...defaultAlarm, securityState: SecuritySubsystem.ALARMSTATE_ARMED };
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Disarm'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Alarm disarmed' },
      });
    });
  });

  it('dispatches error notification on disarm failure', async () => {
    mockAlarm = { ...defaultAlarm, securityState: SecuritySubsystem.ALARMSTATE_ARMED };
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Disarm'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to disarm alarm' },
      });
    });
  });

  it('does nothing when securitySubsystem is undefined', async () => {
    mockAlarm = { ...defaultAlarm, securitySubsystem: undefined as any };
    render(<AlarmStatus />);

    fireEvent.click(screen.getByText('Arm (Full)'));

    await waitFor(() => {
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  // ── Device list ─────────────────────────────────────────────────────
  it('shows security devices', () => {
    const dev = makeDevice('DRIV:dev:d1', { [Device.ATTR_NAME]: 'Front Door', [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE });
    mockAlarm = { ...defaultAlarm, securityDevices: [dev[Base.ATTR_ADDRESS]] };
    mockState = { devices: [dev], incidents: [] };
    render(<AlarmStatus />);

    expect(screen.getByText('Security Devices')).toBeInTheDocument();
    expect(screen.getByText('Front Door')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows device count in status', () => {
    const dev = makeDevice('DRIV:dev:d1', { [Device.ATTR_NAME]: 'Front Door', [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE });
    mockAlarm = { ...defaultAlarm, securityDevices: [dev[Base.ATTR_ADDRESS]] };
    mockState = { devices: [dev], incidents: [] };
    render(<AlarmStatus />);

    expect(screen.getByText(/1 device(?!s)/)).toBeInTheDocument();
  });

  it('pluralizes device count', () => {
    const dev1 = makeDevice('DRIV:dev:d1', { [Device.ATTR_NAME]: 'Front Door', [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE });
    const dev2 = makeDevice('DRIV:dev:d2', { [Device.ATTR_NAME]: 'Back Door', [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE });
    mockAlarm = { ...defaultAlarm, securityDevices: ['DRIV:dev:d1', 'DRIV:dev:d2'] };
    mockState = { devices: [dev1, dev2], incidents: [] };
    render(<AlarmStatus />);

    expect(screen.getByText(/2 devices/)).toBeInTheDocument();
  });

  it('shows triggered device status', () => {
    const dev = makeDevice('DRIV:dev:d1', { [Device.ATTR_NAME]: 'Front Door', [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE });
    mockAlarm = {
      ...defaultAlarm,
      securityState: SecuritySubsystem.ALARMSTATE_ALERT,
      securityDevices: [dev[Base.ATTR_ADDRESS]],
      triggeredDevices: [dev[Base.ATTR_ADDRESS]],
    };
    mockState = { devices: [dev], incidents: [] };
    render(<AlarmStatus />);

    expect(screen.getByText('Triggered')).toBeInTheDocument();
  });

  it('shows triggered device names in status area', () => {
    const dev = makeDevice('DRIV:dev:d1', { [Device.ATTR_NAME]: 'Front Door', [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE });
    mockAlarm = {
      ...defaultAlarm,
      securityState: SecuritySubsystem.ALARMSTATE_ALERT,
      securityDevices: [dev[Base.ATTR_ADDRESS]],
      triggeredDevices: [dev[Base.ATTR_ADDRESS]],
    };
    mockState = { devices: [dev], incidents: [] };
    render(<AlarmStatus />);

    expect(screen.getByText(/Triggered:.*Front Door/)).toBeInTheDocument();
  });

  it('shows offline device status', () => {
    const dev = makeDevice('DRIV:dev:d1', { [Device.ATTR_NAME]: 'Front Door', [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_OFFLINE });
    mockAlarm = { ...defaultAlarm, securityDevices: [dev[Base.ATTR_ADDRESS]] };
    mockState = { devices: [dev], incidents: [] };
    render(<AlarmStatus />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('hides device section when no security devices', () => {
    render(<AlarmStatus />);
    expect(screen.queryByText('Security Devices')).not.toBeInTheDocument();
  });

  // ── Incident tracker ────────────────────────────────────────────────
  it('shows IncidentTracker for active incident', () => {
    const incident = makeIncident('SERV:incident:i1', { [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_ALERT, [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SECURITY });
    mockState = { devices: [], incidents: [incident] };
    render(<AlarmStatus />);

    expect(screen.getByTestId('incident-tracker')).toBeInTheDocument();
  });

  it('shows IncidentTracker for pre-alert incident', () => {
    const incident = makeIncident('SERV:incident:i1', { [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_PREALERT, [AlarmIncident.ATTR_ALERT]: AlarmIncident.ALERT_SECURITY });
    mockState = { devices: [], incidents: [incident] };
    render(<AlarmStatus />);

    expect(screen.getByTestId('incident-tracker')).toBeInTheDocument();
  });

  it('hides IncidentTracker when no active incidents', () => {
    render(<AlarmStatus />);
    expect(screen.queryByTestId('incident-tracker')).not.toBeInTheDocument();
  });

  // ── Panic ───────────────────────────────────────────────────────────
  // Panic comes from keypads, pendants and rules, never from this page.
  it('does not offer a panic button', () => {
    render(<AlarmStatus />);
    expect(screen.queryByText('Panic')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alarm-panic')).not.toBeInTheDocument();
  });
});
