import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Rule, Scheduler } from '@arcus/core';
import { ScheduleEditPanel } from '@/components/schedules/ScheduleEditPanel';
import type { ScheduleMessageTypeOption } from '@/components/schedules';
import type { ScheduleTimezone } from '@/hooks/useScheduleTimezone';
import type { SchedulerEntity } from '@/store/entityTypes';
import { convertScheduleTime } from '@/lib/scheduleTimezone';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockScheduler: SchedulerEntity | undefined;
let mockTimezone: ScheduleTimezone;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (s: object) => unknown) => selector({}),
  useAppDispatch: () => jest.fn(),
}));

jest.mock('@/store/slices/schedulersSlice', () => ({
  selectSchedulerByTarget: () => mockScheduler,
}));

jest.mock('@/hooks/useScheduleTimezone', () => ({
  useScheduleTimezone: () => mockTimezone,
}));

jest.mock('@arcus/core/services', () => ({
  SchedulerService: {
    ScheduleWeeklyCommand: jest.fn(),
    UpdateWeeklyCommand: jest.fn(),
    DeleteCommand: jest.fn(),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const RULE = 'SERV:rule:p1.1';

const RULE_ACTIONS: ScheduleMessageTypeOption[] = [
  { value: Rule.CMD_ENABLE, label: 'Active' },
  { value: Rule.CMD_DISABLE, label: 'Inactive', inactive: true },
];

interface CommandOverrides {
  time?: string;
  days?: string[];
  mode?: string;
  offsetMinutes?: number;
  messageType?: string;
}

function command(overrides: CommandOverrides = {}) {
  return {
    scheduleId: 'RULES',
    time: '22:00:00',
    days: ['MON', 'TUE'],
    mode: 'ABSOLUTE',
    messageType: Rule.CMD_DISABLE,
    attributes: {},
    ...overrides,
  };
}

function scheduler(commands: Record<string, ReturnType<typeof command>>): SchedulerEntity {
  return {
    id: 'SERV:scheduler:s1',
    [Base.ATTR_ADDRESS]: 'SERV:scheduler:s1',
    [Scheduler.ATTR_TARGET]: RULE,
    [Scheduler.ATTR_COMMANDS]: commands,
  };
}

function identityTimezone(): ScheduleTimezone {
  return {
    converts: false,
    toLocal: (time, days) => ({ time, days }),
    toPlace: (time, days) => ({ time, days }),
  };
}

/** Viewer in Tokyo, place in UTC: local = place + 9h. */
function tokyoViewer(): ScheduleTimezone {
  return {
    placeTimeZone: 'UTC',
    placeTimeZoneName: 'Coordinated Universal Time',
    localTimeZone: 'Asia/Tokyo',
    converts: true,
    toLocal: (time, days) => convertScheduleTime('UTC', 'Asia/Tokyo', time, days),
    toPlace: (time, days) => convertScheduleTime('Asia/Tokyo', 'UTC', time, days),
  };
}

function renderRulePanel() {
  return render(
    <ScheduleEditPanel
      targetAddress={RULE}
      targetName="Lock up at night"
      scheduleId="RULES"
      messageType={Rule.CMD_ENABLE}
      messageTypeOptions={RULE_ACTIONS}
      instructions="Choose when the rule is active."
    />,
  );
}

beforeEach(() => {
  mockScheduler = scheduler({ 'cmd-1': command() });
  mockTimezone = identityTimezone();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ScheduleEditPanel', () => {
  it('matches snapshot for a rule schedule', () => {
    const { asFragment } = renderRulePanel();
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with the timezone note', () => {
    mockTimezone = tokyoViewer();
    const { asFragment } = renderRulePanel();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the target name and instructions', () => {
      renderRulePanel();
      expect(screen.getByTestId('schedule-target')).toHaveTextContent('Lock up at night');
      expect(screen.getByTestId('schedule-instructions')).toHaveTextContent('Choose when the rule is active.');
    });

    it('labels and mutes events by their command', () => {
      mockScheduler = scheduler({
        'cmd-1': command({ messageType: Rule.CMD_DISABLE }),
        'cmd-2': command({ messageType: Rule.CMD_ENABLE, time: '06:00:00', days: ['MON'] }),
      });
      renderRulePanel();
      const inactive = screen.getByTestId('schedule-event-cmd-1-mon');
      expect(inactive).toHaveAttribute('title', 'Lock up at night: Inactive at 22:00:00');
      expect(inactive).toHaveStyle({ backgroundColor: 'var(--color-grouse)' });
      const active = screen.getByTestId('schedule-event-cmd-2-mon');
      expect(active).toHaveAttribute('title', 'Lock up at night: Active at 06:00:00');
      expect(active).toHaveStyle({ backgroundColor: 'var(--color-peacock)' });
    });

    it('uses the plain target name for commands without an option', () => {
      mockScheduler = scheduler({ 'cmd-1': command({ messageType: 'other:Cmd' }) });
      renderRulePanel();
      expect(screen.getByTestId('schedule-event-cmd-1-mon'))
        .toHaveAttribute('title', 'Lock up at night at 22:00:00');
    });

    it('hides instructions and the timezone note when not needed', () => {
      render(
        <ScheduleEditPanel targetAddress={RULE} targetName="Rule" scheduleId="RULES" messageType={Rule.CMD_ENABLE} />,
      );
      expect(screen.queryByTestId('schedule-instructions')).not.toBeInTheDocument();
      expect(screen.queryByTestId('schedule-timezone-note')).not.toBeInTheDocument();
    });

    it('shows the empty state without a scheduler', () => {
      mockScheduler = undefined;
      renderRulePanel();
      expect(screen.getByTestId('schedule-empty')).toBeInTheDocument();
    });
  });

  describe('timezone', () => {
    it('explains that times are shown in the viewer\'s timezone', () => {
      mockTimezone = tokyoViewer();
      renderRulePanel();
      expect(screen.getByTestId('schedule-timezone-note')).toHaveTextContent(
        'Times are shown in your time zone (Asia/Tokyo). This place is in Coordinated Universal Time.',
      );
    });

    it('shows absolute events in local time, rolling days forward', () => {
      mockTimezone = tokyoViewer();
      renderRulePanel(); // 22:00 UTC MON/TUE → 07:00 Tokyo TUE/WED
      expect(screen.queryByTestId('schedule-event-cmd-1-mon')).not.toBeInTheDocument();
      expect(screen.getByTestId('schedule-event-cmd-1-tue')).toHaveAttribute('data-time', '07:00:00');
      expect(screen.getByTestId('schedule-event-cmd-1-wed')).toHaveAttribute('data-time', '07:00:00');
    });

    it('leaves sunrise / sunset events unconverted', () => {
      mockTimezone = tokyoViewer();
      mockScheduler = scheduler({ 'cmd-1': command({ mode: 'SUNSET', offsetMinutes: 10 }) });
      renderRulePanel();
      expect(screen.getByTestId('schedule-event-cmd-1-mon')).toHaveAttribute('data-time', '22:00:00');
    });

    it('opens an event for editing in local time', () => {
      mockTimezone = tokyoViewer();
      renderRulePanel();
      fireEvent.click(screen.getByTestId('schedule-event-cmd-1-tue'));
      expect(screen.getByTestId('schedule-save')).toHaveTextContent('Update');
      expect(screen.getByTestId('schedule-hour')).toHaveValue('7');
      expect(screen.getByTestId('schedule-ampm')).toHaveTextContent('AM');
      expect(screen.getByTestId('schedule-day-tue')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('schedule-day-mon')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('interactions', () => {
    it('opens an existing event with its command selected', () => {
      renderRulePanel();
      fireEvent.click(screen.getByTestId('schedule-event-cmd-1-mon'));
      expect(screen.getByTestId('schedule-action-inactive')).toHaveAttribute('aria-pressed', 'true');
    });

    it('adds a new event defaulting to the first command', () => {
      renderRulePanel();
      fireEvent.click(screen.getByTestId('schedule-add-event'));
      expect(screen.getByTestId('schedule-save')).toHaveTextContent('Create');
      expect(screen.getByTestId('schedule-action-active')).toHaveAttribute('aria-pressed', 'true');
    });

    it('returns to the calendar on cancel', () => {
      renderRulePanel();
      fireEvent.click(screen.getByTestId('schedule-add-event'));
      fireEvent.click(screen.getByTestId('schedule-cancel'));
      expect(screen.getByTestId('schedule-add-event')).toBeInTheDocument();
    });
  });
});
