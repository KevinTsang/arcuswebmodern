import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, AlarmSubsystem, Person } from '@arcus/core';
import { AlarmNotificationList } from '@/components/subsystems/AlarmNotificationList';
import type { AlarmCallEntry } from '@/store/entityTypes';

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

const mockPeople = [
  {
    [Base.ATTR_ADDRESS]: 'SERV:person:person-1',
    [Base.ATTR_ID]: 'person-1',
    [Person.ATTR_FIRSTNAME]: 'Alice',
    [Person.ATTR_LASTNAME]: 'Johnson',
  },
  {
    [Base.ATTR_ADDRESS]: 'SERV:person:person-2',
    [Base.ATTR_ID]: 'person-2',
    [Person.ATTR_FIRSTNAME]: 'Bob',
    [Person.ATTR_LASTNAME]: 'Smith',
  },
  {
    [Base.ATTR_ADDRESS]: 'SERV:person:person-3',
    [Base.ATTR_ID]: 'person-3',
    [Person.ATTR_FIRSTNAME]: 'Carol',
    [Person.ATTR_LASTNAME]: 'Davis',
  },
];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      people: {
        ids: ['SERV:person:person-1', 'SERV:person:person-2', 'SERV:person:person-3'],
        entities: {
          'SERV:person:person-1': mockPeople[0],
          'SERV:person:person-2': mockPeople[1],
          'SERV:person:person-3': mockPeople[2],
        },
      },
    }),
  useAppDispatch: () => mockDispatch,
}));

const defaultCallTree: AlarmCallEntry[] = [
  { person: 'SERV:person:person-1', enabled: true },
  { person: 'SERV:person:person-2', enabled: true },
  { person: 'SERV:person:person-3', enabled: false },
];

const defaultAlarm = {
  callTree: defaultCallTree,
  alarmSubsystem: {
    id: 'SERV:subalarm:abc',
    [Base.ATTR_ADDRESS]: 'SERV:subalarm:abc',
  },
};

let mockAlarm = { ...defaultAlarm, callTree: [...defaultCallTree] };

jest.mock('@/hooks/useAlarmSubsystem', () => ({
  useAlarmSubsystem: () => mockAlarm,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function resetAlarm(overrides?: Partial<typeof defaultAlarm>) {
  mockAlarm = {
    ...defaultAlarm,
    callTree: defaultCallTree.map((e) => ({ ...e })),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  resetAlarm();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AlarmNotificationList', () => {
  // ── Snapshot ──────────────────────────────────────────────────────

  it('matches snapshot', () => {
    const { container } = render(<AlarmNotificationList />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for empty state', () => {
    resetAlarm({ callTree: [] });
    const { container } = render(<AlarmNotificationList />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // ── Rendering ─────────────────────────────────────────────────────

  it('renders heading and description text', () => {
    render(<AlarmNotificationList />);
    expect(screen.getByText('Notification List')).toBeInTheDocument();
    expect(
      screen.getByText('People will be notified in this order when an alarm is triggered.'),
    ).toBeInTheDocument();
  });

  it('renders person names from call tree', () => {
    render(<AlarmNotificationList />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Carol Davis')).toBeInTheDocument();
  });

  it('shows position numbers', () => {
    render(<AlarmNotificationList />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows empty state when callTree is empty', () => {
    resetAlarm({ callTree: [] });
    render(<AlarmNotificationList />);
    expect(screen.getByText('Notification List')).toBeInTheDocument();
    expect(
      screen.getByText('No contacts configured for alarm notifications.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
  });

  it('shows Unknown for a person not found in people list', () => {
    resetAlarm({
      callTree: [{ person: 'SERV:person:unknown-addr', enabled: true }],
    });
    render(<AlarmNotificationList />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('reflects enabled/disabled state on toggle switches', () => {
    render(<AlarmNotificationList />);
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[1]).toHaveAttribute('aria-checked', 'true');
    expect(switches[2]).toHaveAttribute('aria-checked', 'false');
  });

  // ── Toggle enable/disable ─────────────────────────────────────────

  it('toggle enable/disable calls Bridge.request with updated callTree', async () => {
    render(<AlarmNotificationList />);

    const toggleAlice = screen.getByRole('switch', { name: /Disable notifications for Alice Johnson/i });
    fireEvent.click(toggleAlice);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subalarm:abc',
        {
          [AlarmSubsystem.ATTR_CALLTREE]: [
            { person: 'SERV:person:person-1', enabled: false },
            { person: 'SERV:person:person-2', enabled: true },
            { person: 'SERV:person:person-3', enabled: false },
          ],
        },
      );
    });
  });

  it('toggle disabled entry to enabled calls Bridge.request with updated callTree', async () => {
    render(<AlarmNotificationList />);

    const toggleCarol = screen.getByRole('switch', { name: /Enable notifications for Carol Davis/i });
    fireEvent.click(toggleCarol);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subalarm:abc',
        {
          [AlarmSubsystem.ATTR_CALLTREE]: [
            { person: 'SERV:person:person-1', enabled: true },
            { person: 'SERV:person:person-2', enabled: true },
            { person: 'SERV:person:person-3', enabled: true },
          ],
        },
      );
    });
  });

  // ── Move up ───────────────────────────────────────────────────────

  it('move up reorders the callTree and calls Bridge.request', async () => {
    render(<AlarmNotificationList />);

    const moveUpBob = screen.getByRole('button', { name: /Move Bob Smith up/i });
    fireEvent.click(moveUpBob);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subalarm:abc',
        {
          [AlarmSubsystem.ATTR_CALLTREE]: [
            { person: 'SERV:person:person-2', enabled: true },
            { person: 'SERV:person:person-1', enabled: true },
            { person: 'SERV:person:person-3', enabled: false },
          ],
        },
      );
    });
  });

  it('move up is disabled for first item', () => {
    render(<AlarmNotificationList />);
    const moveUpAlice = screen.getByRole('button', { name: /Move Alice Johnson up/i });
    expect(moveUpAlice).toBeDisabled();
  });

  // ── Move down ─────────────────────────────────────────────────────

  it('move down reorders the callTree and calls Bridge.request', async () => {
    render(<AlarmNotificationList />);

    const moveDownBob = screen.getByRole('button', { name: /Move Bob Smith down/i });
    fireEvent.click(moveDownBob);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:subalarm:abc',
        {
          [AlarmSubsystem.ATTR_CALLTREE]: [
            { person: 'SERV:person:person-1', enabled: true },
            { person: 'SERV:person:person-3', enabled: false },
            { person: 'SERV:person:person-2', enabled: true },
          ],
        },
      );
    });
  });

  it('move down is disabled for last item', () => {
    render(<AlarmNotificationList />);
    const moveDownCarol = screen.getByRole('button', { name: /Move Carol Davis down/i });
    expect(moveDownCarol).toBeDisabled();
  });

  // ── Error handling ────────────────────────────────────────────────

  it('dispatches error notification on Bridge failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<AlarmNotificationList />);

    const toggleAlice = screen.getByRole('switch', { name: /Disable notifications for Alice Johnson/i });
    fireEvent.click(toggleAlice);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update notification list' },
      });
    });
  });

  it('dispatches error notification on Bridge failure during reorder', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<AlarmNotificationList />);

    const moveUpBob = screen.getByRole('button', { name: /Move Bob Smith up/i });
    fireEvent.click(moveUpBob);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update notification list' },
      });
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it('does not call Bridge when alarmSubsystem is undefined', async () => {
    resetAlarm({ alarmSubsystem: undefined as any });
    render(<AlarmNotificationList />);

    const toggleAlice = screen.getByRole('switch', { name: /Disable notifications for Alice Johnson/i });
    fireEvent.click(toggleAlice);

    await waitFor(() => {
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  it('move up on first item does not call Bridge', async () => {
    render(<AlarmNotificationList />);

    // First item's move-up button is disabled, but even if called directly, it should no-op
    const moveUpAlice = screen.getByRole('button', { name: /Move Alice Johnson up/i });
    expect(moveUpAlice).toBeDisabled();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('move down on last item does not call Bridge', async () => {
    render(<AlarmNotificationList />);

    const moveDownCarol = screen.getByRole('button', { name: /Move Carol Davis down/i });
    expect(moveDownCarol).toBeDisabled();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});
