import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RuleListItem } from '@/components/rules/RuleListItem';
import Bridge from '@arcus/core/bridge';
import { Base, Rule, Scheduler } from '@arcus/core';
import type { RuleEntity, SchedulerEntity } from '@/store/entityTypes';
import type { ScheduleMessageTypeOption } from '@/components/schedules';

interface SchedulePanelProps {
  targetAddress: string;
  targetName: string;
  scheduleId: string;
  messageType: string;
  messageTypeOptions?: ScheduleMessageTypeOption[];
  instructions?: string;
}

const mockDispatch = jest.fn();
const mockOpenRight = jest.fn();
let mockScheduler: SchedulerEntity | undefined;

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: object) => unknown) => selector({}),
}));

jest.mock('@/store/slices/schedulersSlice', () => ({
  selectSchedulerByTarget: () => mockScheduler,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

// Stub the schedule panel so we can assert what the row opens.
jest.mock('@/components/schedules', () => ({
  ScheduleEditPanel: (props: SchedulePanelProps) => <div data-testid="schedule-panel">{JSON.stringify(props)}</div>,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

const mockBridge = Bridge.request as jest.Mock;

const enabledRule: RuleEntity = {
  id: 'SERV:rule:place-1.1',
  [Base.ATTR_ADDRESS]: 'SERV:rule:place-1.1',
  [Rule.ATTR_NAME]: 'My Rule',
  [Rule.ATTR_DESCRIPTION]: 'A test rule description',
  [Rule.ATTR_STATE]: 'ENABLED',
};

const disabledRule: RuleEntity = {
  id: 'SERV:rule:place-1.2',
  [Base.ATTR_ADDRESS]: 'SERV:rule:place-1.2',
  [Rule.ATTR_NAME]: 'Disabled Rule',
  [Rule.ATTR_STATE]: 'DISABLED',
};

function schedulerWith(commands: Record<string, { days: string[] }>): SchedulerEntity {
  return {
    id: 'SERV:scheduler:s1',
    [Base.ATTR_ADDRESS]: 'SERV:scheduler:s1',
    [Scheduler.ATTR_TARGET]: enabledRule[Base.ATTR_ADDRESS],
    [Scheduler.ATTR_COMMANDS]: commands,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridge.mockResolvedValue({});
  mockScheduler = undefined;
});

describe('RuleListItem', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot when scheduled', () => {
    mockScheduler = schedulerWith({ 'cmd-1': { days: ['MON'] } });
    const { asFragment } = render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders rule name and description', () => {
    render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    expect(screen.getByText('My Rule')).toBeInTheDocument();
    expect(screen.getByText('A test rule description')).toBeInTheDocument();
  });

  it('renders fallback name for unnamed rules', () => {
    render(<RuleListItem rule={{ [Base.ATTR_ADDRESS]: 'x', [Rule.ATTR_STATE]: 'ENABLED' }} onEdit={jest.fn()} />);
    expect(screen.getByText('Unnamed Rule')).toBeInTheDocument();
  });

  it('shows toggle in enabled state', () => {
    render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('shows toggle in disabled state with reduced opacity', () => {
    render(<RuleListItem rule={disabledRule} onEdit={jest.fn()} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('calls rule:Disable when toggling off an enabled rule', async () => {
    render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_DISABLE, 'SERV:rule:place-1.1', {});
    });
  });

  it('calls rule:Enable when toggling on a disabled rule', async () => {
    render(<RuleListItem rule={disabledRule} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_ENABLE, 'SERV:rule:place-1.2', {});
    });
  });

  it('dispatches error on toggle failure', async () => {
    mockBridge.mockRejectedValue(new Error('fail'));
    render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error' }),
        }),
      );
    });
  });

  it('calls onEdit with rule when Edit clicked', () => {
    const onEdit = jest.fn();
    render(<RuleListItem rule={enabledRule} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(enabledRule);
  });

  describe('schedule', () => {
    it('renders a Schedule button', () => {
      render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
      expect(screen.getByRole('button', { name: 'Schedule My Rule' })).toBeInTheDocument();
    });

    it('opens the schedule panel for the rule', () => {
      render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
      fireEvent.click(screen.getByTestId(`rule-schedule-${enabledRule.id}`));

      expect(mockOpenRight).toHaveBeenCalledTimes(1);
      const [content, options] = mockOpenRight.mock.calls[0];
      expect(options).toEqual({ title: 'Schedule', key: `schedule:${enabledRule[Base.ATTR_ADDRESS]}` });
      const props = content.props as SchedulePanelProps;
      expect(props).toMatchObject({
        targetAddress: enabledRule[Base.ATTR_ADDRESS],
        targetName: 'My Rule',
        scheduleId: 'RULES',
        messageType: Rule.CMD_ENABLE,
      });
      expect(props.messageTypeOptions).toEqual([
        { value: Rule.CMD_ENABLE, label: 'Active' },
        { value: Rule.CMD_DISABLE, label: 'Inactive', inactive: true },
      ]);
      expect(props.instructions).toMatch(/active or inactive/);
    });

    it('does not mark an unscheduled rule', () => {
      render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
      expect(screen.queryByTestId(`rule-scheduled-${enabledRule.id}`)).not.toBeInTheDocument();
      expect(screen.getByTestId(`rule-schedule-${enabledRule.id}`)).toHaveAttribute('data-scheduled', 'false');
    });

    it('marks a rule with scheduled events', () => {
      mockScheduler = schedulerWith({ 'cmd-1': { days: ['MON'] } });
      render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
      expect(screen.getByTestId(`rule-scheduled-${enabledRule.id}`)).toHaveTextContent('Scheduled');
      expect(screen.getByTestId(`rule-schedule-${enabledRule.id}`)).toHaveAttribute('data-scheduled', 'true');
    });

    it('does not mark a rule whose scheduler has no events', () => {
      mockScheduler = schedulerWith({});
      render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
      expect(screen.queryByTestId(`rule-scheduled-${enabledRule.id}`)).not.toBeInTheDocument();
    });
  });
});
