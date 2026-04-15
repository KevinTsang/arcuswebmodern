import { render, screen } from '@testing-library/react';
import { Base } from '@arcus/core';
import { AlarmDelaySettings } from '@/components/subsystems/AlarmDelaySettings';
import type { SubsystemEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const defaultModeSettings = {
  devices: [] as string[],
  entranceDelaySec: 30,
  exitDelaySec: 30,
  soundsEnabled: true,
  silent: false,
  alarmSensitivityDeviceCount: 1,
};

const defaultAlarm = {
  securitySubsystem: {
    id: 'SERV:subsecurity:abc',
    [Base.ATTR_ADDRESS]: 'SERV:subsecurity:abc',
  } as SubsystemEntity,
  modeSettings: {
    ON: { ...defaultModeSettings },
    PARTIAL: { ...defaultModeSettings },
  },
};

let mockAlarm = { ...defaultAlarm };

jest.mock('@/hooks/useAlarmSubsystem', () => ({
  useAlarmSubsystem: () => mockAlarm,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarm = {
    ...defaultAlarm,
    modeSettings: {
      ON: { ...defaultModeSettings },
      PARTIAL: { ...defaultModeSettings },
    },
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AlarmDelaySettings', () => {
  it('renders heading and description', () => {
    render(<AlarmDelaySettings />);
    expect(screen.getByText('Security Mode Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure delays and sounds for each alarm mode.')).toBeInTheDocument();
  });

  it('renders both mode sections', () => {
    render(<AlarmDelaySettings />);
    expect(screen.getByText('Full (ON)')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('renders nothing when securitySubsystem is undefined', () => {
    mockAlarm = {
      ...defaultAlarm,
      securitySubsystem: undefined as any,
      modeSettings: { ...defaultAlarm.modeSettings },
    };
    const { container } = render(<AlarmDelaySettings />);
    expect(container.firstChild).toBeNull();
  });
});
