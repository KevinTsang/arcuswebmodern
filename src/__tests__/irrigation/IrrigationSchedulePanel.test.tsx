import { render, screen, fireEvent } from '@testing-library/react';
import { IrrigationScheduleMode } from '@arcus/core';
import { IrrigationSchedulePanel } from '@/components/irrigation/IrrigationSchedulePanel';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import type { IrrigationScheduleEvent } from '@/lib/irrigation';
import { CONTROLLER, makeEvent, makeIrrigationState } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockState: IrrigationControllerState;

jest.mock('@/hooks/useIrrigationController', () => ({
  useIrrigationController: () => mockState,
}));

// The editor and interval select have their own tests; stub them so this file
// covers only the panel's navigation.
jest.mock('@/components/irrigation/IrrigationEventEditor', () => ({
  IrrigationEventEditor: ({ mode, event, onClose }: { mode: string; event?: IrrigationScheduleEvent; onClose: () => void }) => (
    <div data-testid="editor-stub" data-mode={mode} data-event={event?.eventId ?? 'new'}>
      <button type="button" data-testid="editor-stub-close" onClick={onClose}>close</button>
    </div>
  ),
}));

jest.mock('@/components/irrigation/IrrigationIntervalSelect', () => ({
  IrrigationIntervalSelect: ({ days }: { days: number }) => <div data-testid="interval-stub">{days}</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const { WEEKLY, INTERVAL, EVEN, ODD } = IrrigationScheduleMode;

function withSchedules(overrides: Partial<IrrigationControllerState> = {}): IrrigationControllerState {
  return makeIrrigationState({
    eventsByMode: {
      [WEEKLY]: [
        makeEvent('late', { timeOfDay: '19:00:00', days: ['SAT'] }),
        makeEvent('early', { timeOfDay: '05:00:00', days: ['MON'] }),
      ],
      [INTERVAL]: [],
      [EVEN]: [makeEvent('e1')],
      [ODD]: [],
    },
    intervalDays: 4,
    ...overrides,
  });
}

function tid(name: string) {
  return screen.getByTestId(`irrigation-schedule-${name}`);
}

beforeEach(() => {
  mockState = withSchedules();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationSchedulePanel', () => {
  describe('snapshots', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<IrrigationSchedulePanel address={CONTROLLER} />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('opens on the weekly tab in manual mode and sorts events by time', () => {
      render(<IrrigationSchedulePanel address={CONTROLLER} />);
      expect(tid('tab-weekly')).toHaveAttribute('aria-selected', 'true');
      const ids = screen.getAllByTestId(/^irrigation-event-(early|late)$/).map((el) => el.getAttribute('data-testid'));
      expect(ids).toEqual(['irrigation-event-early', 'irrigation-event-late']);
      expect(tid('add')).toHaveTextContent('+ Add Weekly Event');
    });

    it('opens on the active mode and marks it', () => {
      mockState = withSchedules({ activeMode: EVEN });
      render(<IrrigationSchedulePanel address={CONTROLLER} />);
      expect(tid('tab-even')).toHaveAttribute('aria-selected', 'true');
      expect(tid('tab-even')).toHaveAttribute('data-active', 'true');
      expect(tid('help')).toHaveTextContent('This is the active schedule.');
      expect(screen.getByTestId('irrigation-event-e1')).toBeInTheDocument();
    });

    it('shows the interval select only on the interval tab', () => {
      render(<IrrigationSchedulePanel address={CONTROLLER} />);
      expect(screen.queryByTestId('interval-stub')).not.toBeInTheDocument();
      fireEvent.click(tid('tab-interval'));
      expect(screen.getByTestId('interval-stub')).toHaveTextContent('4');
      expect(tid('empty')).toHaveTextContent('No interval events.');
    });
  });

  describe('interactions', () => {
    it('switches between mode tabs', () => {
      render(<IrrigationSchedulePanel address={CONTROLLER} />);
      fireEvent.click(tid('tab-odd'));
      expect(tid('tab-odd')).toHaveAttribute('aria-selected', 'true');
      expect(tid('help')).toHaveTextContent('Only water on odd days of the month.');
      expect(tid('empty')).toBeInTheDocument();
    });

    it('adds an event for the selected mode and returns to the list', () => {
      render(<IrrigationSchedulePanel address={CONTROLLER} />);
      fireEvent.click(tid('tab-even'));
      fireEvent.click(tid('add'));
      const editor = screen.getByTestId('editor-stub');
      expect(editor).toHaveAttribute('data-mode', EVEN);
      expect(editor).toHaveAttribute('data-event', 'new');
      expect(tid('tab-weekly')).toBeDisabled();
      expect(screen.queryByTestId('irrigation-schedule-add')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('editor-stub-close'));
      expect(screen.queryByTestId('editor-stub')).not.toBeInTheDocument();
      expect(tid('add')).toBeInTheDocument();
    });

    it('edits an existing event', () => {
      render(<IrrigationSchedulePanel address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('irrigation-event-edit-late'));
      expect(screen.getByTestId('editor-stub')).toHaveAttribute('data-event', 'late');
    });
  });

  describe('edge cases', () => {
    it('shows a message when the controller is missing', () => {
      mockState = makeIrrigationState({ device: undefined });
      render(<IrrigationSchedulePanel address={CONTROLLER} />);
      expect(tid('missing')).toBeInTheDocument();
    });

    it('disables adding events when the controller has no zones', () => {
      mockState = withSchedules({ zones: [] });
      render(<IrrigationSchedulePanel address={CONTROLLER} />);
      expect(tid('add')).toBeDisabled();
    });
  });
});
