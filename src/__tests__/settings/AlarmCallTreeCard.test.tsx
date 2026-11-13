import { render, screen } from '@testing-library/react';
import { Base } from '@arcus/core';
import { AlarmCallTreeCard } from '@/components/settings/AlarmCallTreeCard';
import type { SubsystemEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockAlarmSubsystem: SubsystemEntity | undefined;

jest.mock('@/hooks/useAlarmSubsystem', () => ({
  useAlarmSubsystem: () => ({ alarmSubsystem: mockAlarmSubsystem }),
}));

// The call tree itself is covered by AlarmNotificationList.test.tsx.
jest.mock('@/components/subsystems/AlarmNotificationList', () => ({
  AlarmNotificationList: () => <div data-testid="alarm-notification-list" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmSubsystem = { id: 'SERV:subalarm:place-1', [Base.ATTR_ADDRESS]: 'SERV:subalarm:place-1' };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AlarmCallTreeCard', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<AlarmCallTreeCard />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('reuses the alarm notification list', () => {
    render(<AlarmCallTreeCard />);
    expect(screen.getByText('Alarm Call Tree')).toBeInTheDocument();
    expect(screen.getByTestId('alarm-notification-list')).toBeInTheDocument();
  });

  it('links to the alarm settings page', () => {
    render(<AlarmCallTreeCard />);
    expect(screen.getByTestId('alarm-call-tree-link')).toHaveAttribute('href', '/services/alarms/settings');
  });

  it('explains when the place has no alarm subsystem', () => {
    mockAlarmSubsystem = undefined;
    render(<AlarmCallTreeCard />);
    expect(screen.getByTestId('alarm-call-tree-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('alarm-notification-list')).not.toBeInTheDocument();
  });
});
