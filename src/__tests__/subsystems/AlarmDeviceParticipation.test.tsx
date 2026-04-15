import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Device, SecurityAlarmMode } from '@arcus/core';
import { AlarmDeviceParticipation } from '@/components/subsystems/AlarmDeviceParticipation';
import type { SubsystemEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDR_MOTION = 'DRIV:dev:motion-1';
const ADDR_CONTACT = 'DRIV:dev:contact-2';
const ADDR_GLASS = 'DRIV:dev:glass-3';

const SECURITY_SUBSYSTEM_ADDR = 'SERV:subsecurity:abc';

const motionSensor = makeDevice(ADDR_MOTION, { [Device.ATTR_NAME]: 'Front Door Motion' });
const contactSensor = makeDevice(ADDR_CONTACT, { [Device.ATTR_NAME]: 'Back Door Contact' });
const glassBreak = makeDevice(ADDR_GLASS, { [Device.ATTR_NAME]: 'Living Room Glass Break' });

const defaultModeSettings = {
  devices: [] as string[],
  entranceDelaySec: 30,
  exitDelaySec: 30,
  soundsEnabled: true,
  silent: false,
  alarmSensitivityDeviceCount: 1,
};

const defaultAlarm = {
  recordOnSecurity: false,
  fanShutoffOnSmoke: false,
  fanShutoffOnCO: false,
  callTree: [],
  modeSettings: {
    ON: { ...defaultModeSettings, devices: [ADDR_MOTION, ADDR_CONTACT] },
    PARTIAL: { ...defaultModeSettings, devices: [ADDR_CONTACT, ADDR_GLASS] },
  },
  alarmSubsystem: {
    id: 'SERV:subalarm:abc',
    [Base.ATTR_ADDRESS]: 'SERV:subalarm:abc',
  } as SubsystemEntity,
  securitySubsystem: {
    id: SECURITY_SUBSYSTEM_ADDR,
    [Base.ATTR_ADDRESS]: SECURITY_SUBSYSTEM_ADDR,
  } as SubsystemEntity,
  safetySubsystem: undefined,
  securityMode: 'OFF',
  securityState: 'DISARMED',
  currentIncident: undefined,
  securityDevices: [ADDR_MOTION, ADDR_CONTACT, ADDR_GLASS],
  triggeredDevices: [] as string[],
  offlineDevices: [] as string[],
};

let mockAlarm = { ...defaultAlarm };

const allDevices = [motionSensor, contactSensor, glassBreak];
let mockDevices = [...allDevices];

jest.mock('@/hooks/useAlarmSubsystem', () => ({
  useAlarmSubsystem: () => mockAlarm,
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => mockDevices,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: jest.fn(),
}));

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarm = {
    ...defaultAlarm,
    modeSettings: {
      ON: { ...defaultModeSettings, devices: [ADDR_MOTION, ADDR_CONTACT] },
      PARTIAL: { ...defaultModeSettings, devices: [ADDR_CONTACT, ADDR_GLASS] },
    },
  };
  mockDevices = [...allDevices];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AlarmDeviceParticipation', () => {
  // ── Snapshot ──────────────────────────────────────────────────────

  it('matches snapshot', () => {
    const { container } = render(<AlarmDeviceParticipation />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for empty state', () => {
    mockAlarm = { ...defaultAlarm, securityDevices: [], modeSettings: { ON: { ...defaultModeSettings }, PARTIAL: { ...defaultModeSettings } } };
    const { container } = render(<AlarmDeviceParticipation />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // ── Heading and description ───────────────────────────────────────

  it('renders heading and description text', () => {
    render(<AlarmDeviceParticipation />);
    expect(screen.getByText('Device Participation')).toBeInTheDocument();
    expect(screen.getByText('Choose which alarm modes each device participates in.')).toBeInTheDocument();
  });

  // ── Device name rendering ─────────────────────────────────────────

  it('renders all device names', () => {
    render(<AlarmDeviceParticipation />);
    expect(screen.getByText('Front Door Motion')).toBeInTheDocument();
    expect(screen.getByText('Back Door Contact')).toBeInTheDocument();
    expect(screen.getByText('Living Room Glass Break')).toBeInTheDocument();
  });

  // ── Participation levels ──────────────────────────────────────────

  it('shows "ON Only" for a device in ON mode only', () => {
    // ADDR_MOTION is in ON but not PARTIAL
    render(<AlarmDeviceParticipation />);
    const selects = screen.getAllByRole('combobox');
    // Motion sensor is first — should be "on"
    expect(selects[0]).toHaveValue('on');
  });

  it('shows "ON & Partial" for a device in both modes', () => {
    // ADDR_CONTACT is in both ON and PARTIAL
    render(<AlarmDeviceParticipation />);
    const selects = screen.getAllByRole('combobox');
    // Contact sensor is second — should be "both"
    expect(selects[1]).toHaveValue('both');
  });

  it('shows "Partial Only" for a device in PARTIAL mode only', () => {
    // ADDR_GLASS is in PARTIAL but not ON
    render(<AlarmDeviceParticipation />);
    const selects = screen.getAllByRole('combobox');
    // Glass break is third — should be "partial"
    expect(selects[2]).toHaveValue('partial');
  });

  it('shows "Not Participating" for a device in neither mode', () => {
    mockAlarm = {
      ...defaultAlarm,
      modeSettings: {
        ON: { ...defaultModeSettings, devices: [] },
        PARTIAL: { ...defaultModeSettings, devices: [] },
      },
    };
    render(<AlarmDeviceParticipation />);
    const selects = screen.getAllByRole('combobox');
    expect(selects[0]).toHaveValue('none');
    expect(selects[1]).toHaveValue('none');
    expect(selects[2]).toHaveValue('none');
  });

  // ── Empty state ───────────────────────────────────────────────────

  it('shows empty state when no security devices are configured', () => {
    mockAlarm = {
      ...defaultAlarm,
      securityDevices: [],
      modeSettings: {
        ON: { ...defaultModeSettings },
        PARTIAL: { ...defaultModeSettings },
      },
    };
    render(<AlarmDeviceParticipation />);
    expect(screen.getByText('Device Participation')).toBeInTheDocument();
    expect(screen.getByText('No security devices configured.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  // ── Interaction: changing participation ────────────────────────────

  it('calls Bridge.request with updated device lists when changing to "both"', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmDeviceParticipation />);

    // Change ADDR_MOTION (index 0) from "on" to "both"
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'both' } });

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        SECURITY_SUBSYSTEM_ADDR,
        {
          [`${SecurityAlarmMode.ATTR_DEVICES}:ON`]: [ADDR_CONTACT, ADDR_MOTION],
          [`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`]: [ADDR_CONTACT, ADDR_GLASS, ADDR_MOTION],
        },
      );
    });
  });

  it('calls Bridge.request with updated device lists when changing to "none"', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmDeviceParticipation />);

    // Change ADDR_CONTACT (index 1, currently "both") to "none"
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'none' } });

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        SECURITY_SUBSYSTEM_ADDR,
        {
          [`${SecurityAlarmMode.ATTR_DEVICES}:ON`]: [ADDR_MOTION],
          [`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`]: [ADDR_GLASS],
        },
      );
    });
  });

  it('calls Bridge.request with updated device lists when changing to "partial"', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmDeviceParticipation />);

    // Change ADDR_MOTION (index 0, currently "on") to "partial"
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'partial' } });

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        SECURITY_SUBSYSTEM_ADDR,
        {
          [`${SecurityAlarmMode.ATTR_DEVICES}:ON`]: [ADDR_CONTACT],
          [`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`]: [ADDR_CONTACT, ADDR_GLASS, ADDR_MOTION],
        },
      );
    });
  });

  it('calls Bridge.request with updated device lists when changing to "on"', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmDeviceParticipation />);

    // Change ADDR_GLASS (index 2, currently "partial") to "on"
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: 'on' } });

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        SECURITY_SUBSYSTEM_ADDR,
        {
          [`${SecurityAlarmMode.ATTR_DEVICES}:ON`]: [ADDR_MOTION, ADDR_CONTACT, ADDR_GLASS],
          [`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`]: [ADDR_CONTACT],
        },
      );
    });
  });

  // ── Error handling ────────────────────────────────────────────────

  it('dispatches error notification when Bridge.request fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<AlarmDeviceParticipation />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'both' } });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update device participation' },
      });
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it('does not call Bridge.request when securitySubsystem is undefined', async () => {
    mockAlarm = { ...defaultAlarm, securitySubsystem: undefined as any };
    render(<AlarmDeviceParticipation />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'both' } });

    await waitFor(() => {
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  it('renders "Unknown" for a device without a name', () => {
    const noNameDevice = {
      id: ADDR_MOTION,
      [Base.ATTR_ADDRESS]: ADDR_MOTION,
    };
    mockDevices = [noNameDevice, contactSensor, glassBreak];
    render(<AlarmDeviceParticipation />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
