import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, AlarmSubsystem, SecuritySubsystem } from '@arcus/core';
import { AlarmSettings } from '@/components/subsystem/AlarmSettings';
import type { SubsystemEntity } from '@/store/entityTypes';

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

const defaultAlarm = {
  recordOnSecurity: false,
  fanShutoffOnSmoke: false,
  fanShutoffOnCO: false,
  alarmSubsystem: { id: 'SERV:subalarm:abc', [Base.ATTR_ADDRESS]: 'SERV:subalarm:abc' } as SubsystemEntity,
  securitySubsystem: undefined,
  safetySubsystem: undefined,
  securityMode: SecuritySubsystem.ALARMMODE_OFF,
  securityState: SecuritySubsystem.ALARMSTATE_DISARMED,
  currentIncident: undefined,
  securityDevices: [] as string[],
  triggeredDevices: [] as string[],
  offlineDevices: [] as string[],
};

let mockAlarm = { ...defaultAlarm };

jest.mock('@/hooks/useSubsystem', () => ({
  useAlarmSubsystem: () => mockAlarm,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarm = { ...defaultAlarm };
});

describe('AlarmSettings', () => {
  it('renders all three toggles', () => {
    render(<AlarmSettings />);
    expect(screen.getByText('Record on Security Alarm')).toBeInTheDocument();
    expect(screen.getByText('Fan Shutoff on Smoke')).toBeInTheDocument();
    expect(screen.getByText('Fan Shutoff on CO')).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<AlarmSettings />);
    expect(screen.getByText('Alarm Settings')).toBeInTheDocument();
  });

  it('toggles recordOnSecurity from off to on', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmSettings />);

    fireEvent.click(screen.getByText('Record on Security Alarm').closest('div')!.parentElement!.querySelector('button[role="switch"]')!);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subalarm:abc',
        { [AlarmSubsystem.ATTR_RECORDONSECURITY]: true },
      );
    });
  });

  it('toggles recordOnSecurity from on to off', async () => {
    mockAlarm = { ...defaultAlarm, recordOnSecurity: true };
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmSettings />);

    fireEvent.click(screen.getByText('Record on Security Alarm').closest('div')!.parentElement!.querySelector('button[role="switch"]')!);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subalarm:abc',
        { [AlarmSubsystem.ATTR_RECORDONSECURITY]: false },
      );
    });
  });

  it('toggles fanShutoffOnSmoke', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmSettings />);

    fireEvent.click(screen.getByText('Fan Shutoff on Smoke').closest('div')!.parentElement!.querySelector('button[role="switch"]')!);

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

    fireEvent.click(screen.getByText('Fan Shutoff on CO').closest('div')!.parentElement!.querySelector('button[role="switch"]')!);

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

    fireEvent.click(screen.getByText('Record on Security Alarm').closest('div')!.parentElement!.querySelector('button[role="switch"]')!);

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

    fireEvent.click(screen.getByText('Record on Security Alarm').closest('div')!.parentElement!.querySelector('button[role="switch"]')!);

    await waitFor(() => {
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  it('reflects enabled state on toggle switches', () => {
    mockAlarm = { ...defaultAlarm, recordOnSecurity: true, fanShutoffOnSmoke: true, fanShutoffOnCO: false };
    render(<AlarmSettings />);

    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[1]).toHaveAttribute('aria-checked', 'true');
    expect(switches[2]).toHaveAttribute('aria-checked', 'false');
  });
});
