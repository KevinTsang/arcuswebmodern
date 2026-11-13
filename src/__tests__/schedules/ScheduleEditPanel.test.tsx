import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Scheduler, Thermostat } from '@arcus/core';
import { ScheduleEditPanel } from '@/components/schedules/ScheduleEditPanel';
import type { ScheduleAttributeEditorProps, ScheduledCommand } from '@/components/schedules/types';
import type { SchedulerEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const THERM = 'DRIV:dev:therm-1';
const mockDispatch = jest.fn();
const mockScheduleWeekly = jest.fn();
const mockUpdateWeekly = jest.fn();
const mockDeleteCommand = jest.fn();
let mockScheduler: SchedulerEntity | undefined;

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: object) => unknown) => selector({}),
}));

jest.mock('@/store/slices/schedulersSlice', () => ({
  selectSchedulerByTarget: () => mockScheduler,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@arcus/core/services', () => ({
  SchedulerService: {
    ScheduleWeeklyCommand: (...args: unknown[]) => mockScheduleWeekly(...args),
    UpdateWeeklyCommand: (...args: unknown[]) => mockUpdateWeekly(...args),
    DeleteCommand: (...args: unknown[]) => mockDeleteCommand(...args),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HEAT = Thermostat.HVACMODE_HEAT;
const COOL = Thermostat.HVACMODE_COOL;
const AUTO = Thermostat.HVACMODE_AUTO;

const command = (overrides: ScheduledCommand): ScheduledCommand => ({
  mode: 'ABSOLUTE',
  messageType: Base.CMD_SETATTRIBUTES,
  days: ['MON', 'WED'],
  ...overrides,
});

const schedulerWith = (commands: { [id: string]: ScheduledCommand }): SchedulerEntity => ({
  id: 'SERV:scheduler:s1',
  [Base.ATTR_ADDRESS]: 'SERV:scheduler:s1',
  [Scheduler.ATTR_TARGET]: THERM,
  [Scheduler.ATTR_COMMANDS]: commands,
});

const describeEvent = (cmd: ScheduledCommand) => `${cmd.scheduleId} ${cmd.attributes?.level ?? '-'}`;

function LevelEditor({ scheduleId, attributes, onChange }: ScheduleAttributeEditorProps) {
  return (
    <button
      data-testid="level-editor"
      data-schedule={scheduleId}
      onClick={() => onChange({ ...attributes, level: Number(attributes.level ?? 0) + 1 })}
    >
      level {String(attributes.level ?? 'none')}
    </button>
  );
}

const renderLevelEditor = (props: ScheduleAttributeEditorProps) => <LevelEditor {...props} />;

function renderPanel(overrides: Partial<React.ComponentProps<typeof ScheduleEditPanel>> = {}) {
  return render(
    <ScheduleEditPanel
      targetAddress={THERM}
      targetName="Hallway Thermostat"
      scheduleId={HEAT}
      messageType={Base.CMD_SETATTRIBUTES}
      modes={[HEAT, COOL, AUTO]}
      modeLabels={{ [HEAT]: 'Heat', [COOL]: 'Cool', [AUTO]: 'Auto' }}
      renderAttributeEditor={renderLevelEditor}
      defaultAttributes={{ level: 5, other: 'x' }}
      describeEvent={describeEvent}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockScheduleWeekly.mockResolvedValue({});
  mockUpdateWeekly.mockResolvedValue({});
  mockDeleteCommand.mockResolvedValue({});
  mockScheduler = schedulerWith({
    'cmd-late': command({ scheduleId: HEAT, time: '22:00:00', attributes: { level: 2 } }),
    'cmd-early': command({ scheduleId: HEAT, time: '06:30:00', days: ['SUN', 'MON'] }),
    'cmd-cool': command({ scheduleId: COOL, time: '12:00:00', attributes: { level: 9 } }),
  });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ScheduleEditPanel – schedule groups', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderPanel();
    expect(asFragment()).toMatchSnapshot();
  });

  it('labels the groups and marks the active one', () => {
    renderPanel();
    expect(screen.getByTestId('schedule-group-heat')).toHaveTextContent('Heat');
    expect(screen.getByTestId('schedule-group-heat')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('schedule-group-cool')).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back to the raw group id without labels', () => {
    renderPanel({ modeLabels: undefined });
    expect(screen.getByTestId('schedule-group-heat')).toHaveTextContent('HEAT');
  });

  it('shows only the active group on the calendar and in the list', () => {
    renderPanel();
    expect(screen.getByTestId('schedule-event-cmd-late-mon')).toBeInTheDocument();
    expect(screen.queryByTestId('schedule-event-cmd-cool-mon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('schedule-event-row-cmd-cool')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('schedule-group-cool'));
    expect(screen.getByTestId('schedule-event-cmd-cool-mon')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-event-row-cmd-cool')).toHaveTextContent('12:00 PM');
    expect(screen.getByTestId('schedule-event-row-cmd-cool')).toHaveTextContent('COOL 9');
  });

  it('lists events in time order with their days and description', () => {
    renderPanel();
    const rows = screen.getAllByTestId(/^schedule-event-row-/);
    expect(rows.map((r) => r.dataset.testid)).toEqual(['schedule-event-row-cmd-early', 'schedule-event-row-cmd-late']);
    expect(rows[0]).toHaveTextContent('6:30 AM');
    expect(rows[0]).toHaveTextContent('Mon, Sun');
    expect(rows[1]).toHaveTextContent('10:00 PM');
    expect(rows[1]).toHaveTextContent('HEAT 2');
  });

  it('labels calendar events with their description', () => {
    renderPanel();
    expect(screen.getByTestId('schedule-event-cmd-late-mon'))
      .toHaveAttribute('title', 'Hallway Thermostat: HEAT 2 at 22:00:00');
  });

  it('shows the empty state for a group without events', () => {
    renderPanel();
    expect(screen.queryByTestId('schedule-empty')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('schedule-group-auto'));
    expect(screen.getByTestId('schedule-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('schedule-event-list')).not.toBeInTheDocument();
  });

  it('does not list events without a describer', () => {
    renderPanel({ describeEvent: undefined });
    expect(screen.queryByTestId('schedule-event-list')).not.toBeInTheDocument();
  });

  it('handles a scheduler without commands', () => {
    mockScheduler = undefined;
    renderPanel();
    expect(screen.getByTestId('schedule-empty')).toBeInTheDocument();
  });
});

describe('ScheduleEditPanel – editing with an attribute editor', () => {
  it('locks the group tabs while editing', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('schedule-add-event'));
    expect(screen.getByTestId('schedule-group-cool')).toBeDisabled();
  });

  it('creates an event with the default attributes and edits', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('schedule-group-cool'));
    fireEvent.click(screen.getByTestId('schedule-add-event'));
    expect(screen.getByTestId('level-editor')).toHaveAttribute('data-schedule', COOL);
    expect(screen.getByTestId('level-editor')).toHaveTextContent('level 5');

    fireEvent.click(screen.getByTestId('level-editor'));
    fireEvent.click(screen.getByTestId('schedule-save'));

    await waitFor(() => expect(mockScheduleWeekly).toHaveBeenCalledWith(
      THERM, COOL, expect.any(Array), 'ABSOLUTE', '12:00:00', undefined,
      Base.CMD_SETATTRIBUTES, { level: 6, other: 'x' },
    ));
    await waitFor(() => expect(screen.getByTestId('schedule-add-event')).toBeInTheDocument());
  });

  it('fills attributes missing from an existing event with the defaults', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('schedule-event-row-cmd-late'));
    expect(screen.getByTestId('level-editor')).toHaveTextContent('level 2');
    fireEvent.click(screen.getByTestId('schedule-save'));
    await waitFor(() => expect(mockUpdateWeekly).toHaveBeenCalledWith(
      THERM, HEAT, 'cmd-late', ['MON', 'WED'], 'ABSOLUTE', '22:00:00', undefined,
      Base.CMD_SETATTRIBUTES, { level: 2, other: 'x' },
    ));
  });

  it('opens an event without attributes using the defaults', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('schedule-event-cmd-early-mon'));
    expect(screen.getByTestId('level-editor')).toHaveTextContent('level 5');
    expect(screen.getByTestId('schedule-save')).toHaveTextContent('Update');
  });

  it('keeps the editor open and reports a failed save', async () => {
    mockScheduleWeekly.mockRejectedValueOnce(new Error('fail'));
    renderPanel();
    fireEvent.click(screen.getByTestId('schedule-add-event'));
    fireEvent.click(screen.getByTestId('schedule-save'));
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to save event.' },
    }));
    expect(screen.getByTestId('level-editor')).toBeInTheDocument();
  });
});
