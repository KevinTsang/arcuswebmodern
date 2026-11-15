import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Rule, Scene } from '@arcus/core';
import { ScheduleEventEditor, type ScheduleEventData } from '@/components/schedules/ScheduleEventEditor';
import type { ScheduleMessageTypeOption } from '@/components/schedules';
import type { ScheduleTimezone } from '@/hooks/useScheduleTimezone';
import { convertScheduleTime } from '@/lib/scheduleTimezone';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockSchedule = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
let mockTimezone: ScheduleTimezone;

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@arcus/core/services', () => ({
  SchedulerService: {
    ScheduleWeeklyCommand: (...args: unknown[]) => mockSchedule(...args),
    UpdateWeeklyCommand: (...args: unknown[]) => mockUpdate(...args),
    DeleteCommand: (...args: unknown[]) => mockDelete(...args),
  },
}));

jest.mock('@/hooks/useScheduleTimezone', () => ({
  useScheduleTimezone: () => mockTimezone,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const RULE = 'SERV:rule:p1.1';

const RULE_ACTIONS: ScheduleMessageTypeOption[] = [
  { value: Rule.CMD_ENABLE, label: 'Active' },
  { value: Rule.CMD_DISABLE, label: 'Inactive', inactive: true },
];

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
    placeTimeZoneName: 'UTC',
    localTimeZone: 'Asia/Tokyo',
    converts: true,
    toLocal: (time, days) => convertScheduleTime('UTC', 'Asia/Tokyo', time, days),
    toPlace: (time, days) => convertScheduleTime('Asia/Tokyo', 'UTC', time, days),
  };
}

function existingEvent(overrides: Partial<ScheduleEventData> = {}): ScheduleEventData {
  return {
    id: 'cmd-1',
    time: '08:00:00',
    days: ['MON'],
    mode: 'ABSOLUTE',
    offsetMinutes: 0,
    scheduleId: 'RULES',
    messageType: Rule.CMD_DISABLE,
    attributes: {},
    ...overrides,
  };
}

function renderRuleEditor(event?: ScheduleEventData, onSave = jest.fn()) {
  render(
    <ScheduleEventEditor
      target={RULE}
      scheduleId="RULES"
      messageType={Rule.CMD_ENABLE}
      messageTypeOptions={RULE_ACTIONS}
      event={event}
      onSave={onSave}
      onCancel={jest.fn()}
    />,
  );
  return onSave;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTimezone = identityTimezone();
  mockSchedule.mockResolvedValue({});
  mockUpdate.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ScheduleEventEditor', () => {
  it('matches snapshot with a state selector', () => {
    const { asFragment } = render(
      <ScheduleEventEditor
        target={RULE}
        scheduleId="RULES"
        messageType={Rule.CMD_ENABLE}
        messageTypeOptions={RULE_ACTIONS}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('state selector', () => {
    it('defaults a new event to the first option', () => {
      renderRuleEditor();
      expect(screen.getByTestId('schedule-action-active')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('schedule-action-inactive')).toHaveAttribute('aria-pressed', 'false');
    });

    it('preselects an existing event\'s command', () => {
      renderRuleEditor(existingEvent());
      expect(screen.getByTestId('schedule-action-inactive')).toHaveAttribute('aria-pressed', 'true');
    });

    it('falls back to the first option when the event\'s command is not offered', () => {
      renderRuleEditor(existingEvent({ messageType: 'rule:Unknown' }));
      expect(screen.getByTestId('schedule-action-active')).toHaveAttribute('aria-pressed', 'true');
    });

    it('is hidden without options', () => {
      render(<ScheduleEventEditor target="SERV:scene:s1" scheduleId="FIRE" messageType={Scene.CMD_FIRE} />);
      expect(screen.queryByTestId('schedule-action-active')).not.toBeInTheDocument();
    });

    it('is hidden with a single option', () => {
      render(
        <ScheduleEventEditor
          target={RULE}
          scheduleId="RULES"
          messageType={Rule.CMD_ENABLE}
          messageTypeOptions={[RULE_ACTIONS[0]]}
        />,
      );
      expect(screen.queryByTestId('schedule-action-active')).not.toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('creates an event with the selected command', async () => {
      const onSave = renderRuleEditor();
      fireEvent.click(screen.getByTestId('schedule-action-inactive'));
      expect(screen.getByTestId('schedule-action-inactive')).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(screen.getByTestId('schedule-save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(mockSchedule).toHaveBeenCalledWith(
        RULE, 'RULES', ['MON', 'TUE', 'WED', 'THU', 'FRI'], 'ABSOLUTE', '12:00:00', undefined,
        Rule.CMD_DISABLE, {},
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification', payload: { type: 'success', message: 'Event created.' },
      });
    });

    it('updates an event with a changed command', async () => {
      const onSave = renderRuleEditor(existingEvent());
      fireEvent.click(screen.getByTestId('schedule-action-active'));
      fireEvent.click(screen.getByTestId('schedule-save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(mockUpdate).toHaveBeenCalledWith(
        RULE, 'RULES', 'cmd-1', ['MON'], 'ABSOLUTE', '08:00:00', undefined, Rule.CMD_ENABLE, {},
      );
    });

    it('reports a failed save', async () => {
      mockSchedule.mockRejectedValueOnce(new Error('fail'));
      const onSave = renderRuleEditor();
      fireEvent.click(screen.getByTestId('schedule-save'));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to save event.' },
      }));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByTestId('schedule-save')).not.toBeDisabled();
    });

    it('uses the messageType prop for targets without options', async () => {
      render(<ScheduleEventEditor target="SERV:scene:s1" scheduleId="FIRE" messageType={Scene.CMD_FIRE} />);
      fireEvent.click(screen.getByTestId('schedule-save'));
      await waitFor(() => expect(mockSchedule).toHaveBeenCalled());
      expect(mockSchedule.mock.calls[0][6]).toBe(Scene.CMD_FIRE);
    });
  });

  describe('timezone conversion', () => {
    it('converts a local time to place time, rolling the days back', async () => {
      mockTimezone = tokyoViewer();
      const onSave = renderRuleEditor(existingEvent({ time: '05:00:00', days: ['MON', 'SAT'] }));
      fireEvent.click(screen.getByTestId('schedule-save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(mockUpdate).toHaveBeenCalledWith(
        RULE, 'RULES', 'cmd-1', ['SUN', 'FRI'], 'ABSOLUTE', '20:00:00', undefined, Rule.CMD_DISABLE, {},
      );
    });

    it('does not convert sunrise / sunset events', async () => {
      mockTimezone = tokyoViewer();
      const onSave = renderRuleEditor(existingEvent({ mode: 'SUNSET', offsetMinutes: -30, days: ['MON'] }));
      fireEvent.click(screen.getByTestId('schedule-save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(mockUpdate).toHaveBeenCalledWith(
        RULE, 'RULES', 'cmd-1', ['MON'], 'SUNSET', undefined, -30, Rule.CMD_DISABLE, {},
      );
    });
  });
});
