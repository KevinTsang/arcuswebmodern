import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, AlarmSubsystem, SecuritySubsystem } from '@arcus/core';
import { AlarmSettings } from '@/components/subsystems/AlarmSettings';
import type { SubsystemEntity } from '@/store/entityTypes';

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: any) => any) => sel({
    people: { ids: [], entities: {} },
    devices: { ids: [], entities: {} },
  }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

const defaultModeSettings = {
  devices: [] as string[],
  entranceDelaySec: 30,
  exitDelaySec: 30,
  soundsEnabled: true,
  silent: false,
  alarmSensitivityDeviceCount: 1,
};

const defaultAlarm = {
  fanShutoffOnSmoke: false,
  fanShutoffOnCO: false,
  callTree: [],
  modeSettings: { ON: { ...defaultModeSettings }, PARTIAL: { ...defaultModeSettings } },
  alarmSubsystem: { id: 'SERV:subalarm:abc', [Base.ATTR_ADDRESS]: 'SERV:subalarm:abc' } as SubsystemEntity,
  securitySubsystem: {
    id: 'SERV:subsecurity:abc',
    [Base.ATTR_ADDRESS]: 'SERV:subsecurity:abc',
  } as SubsystemEntity,
  safetySubsystem: undefined,
  securityMode: SecuritySubsystem.ALARMMODE_OFF,
  securityState: SecuritySubsystem.ALARMSTATE_DISARMED,
  currentIncident: undefined,
  securityDevices: [] as string[],
  triggeredDevices: [] as string[],
  offlineDevices: [] as string[],
};

let mockAlarm = { ...defaultAlarm };

jest.mock('@/hooks/useAlarmSubsystem', () => ({
  useAlarmSubsystem: () => mockAlarm,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarm = { ...defaultAlarm };
});

describe('AlarmSettings', () => {
  it('matches snapshot', () => {
    const { container } = render(<AlarmSettings />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders both fan shutoff toggles', () => {
    render(<AlarmSettings />);
    expect(screen.getByText('Fan Shutoff on Smoke')).toBeInTheDocument();
    expect(screen.getByText('Fan Shutoff on CO')).toBeInTheDocument();
  });

  it('renders section headings', () => {
    render(<AlarmSettings />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Notification List')).toBeInTheDocument();
    expect(screen.getByText('Security Mode Settings')).toBeInTheDocument();
    expect(screen.getByText('Device Participation')).toBeInTheDocument();
  });

  it('does not offer camera recording on security alarm', () => {
    render(<AlarmSettings />);
    expect(screen.queryByText('Record on Security Alarm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setting-record-on-security-alarm')).not.toBeInTheDocument();
  });

  it('toggles fanShutoffOnSmoke', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmSettings />);

    fireEvent.click(screen.getByRole('switch', { name: 'Fan Shutoff on Smoke' }));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subalarm:abc',
        { [AlarmSubsystem.ATTR_FANSHUTOFFONSMOKE]: true },
      );
    });
  });

  it('toggles fanShutoffOnCO', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmSettings />);

    fireEvent.click(screen.getByRole('switch', { name: 'Fan Shutoff on CO' }));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subalarm:abc',
        { [AlarmSubsystem.ATTR_FANSHUTOFFONCO]: true },
      );
    });
  });

  it('dispatches error notification on toggle failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<AlarmSettings />);

    fireEvent.click(screen.getByRole('switch', { name: 'Fan Shutoff on Smoke' }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update setting' },
      });
    });
  });

  it('does nothing when alarmSubsystem is undefined', async () => {
    mockAlarm = { ...defaultAlarm, alarmSubsystem: undefined as any };
    render(<AlarmSettings />);

    fireEvent.click(screen.getByRole('switch', { name: 'Fan Shutoff on Smoke' }));

    await waitFor(() => {
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  it('reflects enabled state on toggle switches', () => {
    mockAlarm = { ...defaultAlarm, fanShutoffOnSmoke: true, fanShutoffOnCO: false };
    render(<AlarmSettings />);

    expect(screen.getByRole('switch', { name: 'Fan Shutoff on Smoke' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Fan Shutoff on CO' })).toHaveAttribute('aria-checked', 'false');
  });
});
