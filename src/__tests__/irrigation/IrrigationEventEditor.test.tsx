import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  IRRIGATION_ERROR_HAS_OVERLAPS, IrrigationScheduleMode, LawnNGardenSubsystem,
} from '@arcus/core';
import { IrrigationEventEditor } from '@/components/irrigation/IrrigationEventEditor';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import {
  CONTROLLER, SUBSYSTEM, makeEvent, makeIrrigationState, makeZone,
} from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
const mockOnClose = jest.fn();
let mockState: IrrigationControllerState;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/hooks/useIrrigationController', () => ({
  useIrrigationController: () => mockState,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const NOW = 1_800_000_000_000;
const { WEEKLY, INTERVAL, EVEN, ODD } = IrrigationScheduleMode;

const WEEKLY_EVENT = makeEvent('w1', {
  timeOfDay: '06:30:00',
  days: ['MON', 'WED'],
  events: [{ zone: 'z2', duration: 5 }, { zone: 'z1', duration: 20 }],
});
const EVEN_EVENT = makeEvent('e1', { timeOfDay: '18:00:00', events: [{ zone: 'z1', duration: 10 }] });

function notification(type: string, message: string) {
  return { type: 'ui/addNotification', payload: { type, message } };
}

function tid(name: string) {
  return screen.getByTestId(`irrigation-event-${name}`);
}

function queryTid(name: string) {
  return screen.queryByTestId(`irrigation-event-${name}`);
}

/** The order of the selected zones as rendered. */
function selectedZoneOrder(): string[] {
  return screen.getAllByTestId(/^irrigation-event-zone-z\d+$/)
    .filter((el) => el.getAttribute('data-selected') === 'true')
    .map((el) => el.getAttribute('data-testid')!.replace('irrigation-event-zone-', ''));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockState = makeIrrigationState({
    zones: [makeZone(1, { name: 'Front' }), makeZone(2, { name: 'Back' }), makeZone(3, { name: 'Side', defaultDuration: 15 })],
  });
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  jest.spyOn(Date.prototype, 'getHours').mockReturnValue(7);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationEventEditor', () => {
  describe('snapshots', () => {
    it('matches snapshot for a new weekly event', () => {
      const { asFragment } = render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} onClose={mockOnClose} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot when editing a weekly event', () => {
      const { asFragment } = render(
        <IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />,
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('starts a new event with no zones, the current hour and no days', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} onClose={mockOnClose} />);
      expect(selectedZoneOrder()).toEqual([]);
      expect(tid('time')).toHaveValue('07:00');
      expect(tid('zones-error')).toBeInTheDocument();
      expect(tid('days-error')).toBeInTheDocument();
      expect(tid('save')).toBeDisabled();
      expect(queryTid('delete')).not.toBeInTheDocument();
    });

    it('loads an existing event in its zone order', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />);
      expect(selectedZoneOrder()).toEqual(['z2', 'z1']);
      expect(tid('zone-duration-z1')).toHaveValue('20');
      expect(tid('time')).toHaveValue('06:30');
      expect(tid('day-MON')).toHaveAttribute('aria-pressed', 'true');
      expect(tid('day-TUE')).toHaveAttribute('aria-pressed', 'false');
      expect(tid('save')).toBeEnabled();
      expect(tid('delete')).toBeInTheDocument();
    });

    it('hides days for non-weekly modes', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={EVEN_EVENT} onClose={mockOnClose} />);
      expect(queryTid('day-MON')).not.toBeInTheDocument();
      expect(tid('save')).toBeEnabled();
    });

    it('preselects the only zone of a single-zone controller', () => {
      mockState = makeIrrigationState({ zones: [makeZone(1, { name: 'Garden', defaultDuration: 5 })] });
      render(<IrrigationEventEditor address={CONTROLLER} mode={ODD} onClose={mockOnClose} />);
      expect(screen.getByText('Select Duration')).toBeInTheDocument();
      expect(queryTid('select-all')).not.toBeInTheDocument();
      expect(queryTid('zone-toggle-z1')).not.toBeInTheDocument();
      expect(tid('zone-duration-z1')).toHaveValue('5');
      expect(tid('save')).toBeEnabled();
    });

    it('keeps a non-standard duration selectable', () => {
      const event = makeEvent('e', { events: [{ zone: 'z1', duration: 17 }] });
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={event} onClose={mockOnClose} />);
      expect(tid('zone-duration-z1')).toHaveValue('17');
    });
  });

  describe('editing the form', () => {
    it('selects and deselects zones', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} onClose={mockOnClose} />);
      fireEvent.click(tid('zone-toggle-z3'));
      expect(selectedZoneOrder()).toEqual(['z3']);
      expect(tid('zone-duration-z3')).toHaveValue('15');
      fireEvent.click(tid('zone-toggle-z3'));
      expect(selectedZoneOrder()).toEqual([]);
    });

    it('selects and clears all zones', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={EVEN_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('select-all'));
      expect(selectedZoneOrder()).toEqual(['z1', 'z2', 'z3']);
      expect(tid('select-all')).toBeChecked();
      fireEvent.click(tid('select-all'));
      expect(selectedZoneOrder()).toEqual([]);
    });

    it('reorders zones', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />);
      expect(tid('zone-up-z2')).toBeDisabled();
      expect(tid('zone-down-z1')).toBeDisabled();
      fireEvent.click(tid('zone-up-z1'));
      expect(selectedZoneOrder()).toEqual(['z1', 'z2']);
      fireEvent.click(tid('zone-down-z1'));
      expect(selectedZoneOrder()).toEqual(['z2', 'z1']);
    });

    it('toggles days', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('day-MON'));
      fireEvent.click(tid('day-WED'));
      expect(tid('days-error')).toBeInTheDocument();
      expect(tid('save')).toBeDisabled();
      fireEvent.click(tid('day-SUN'));
      expect(queryTid('days-error')).not.toBeInTheDocument();
    });

    it('requires a start time', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={EVEN_EVENT} onClose={mockOnClose} />);
      fireEvent.change(tid('time'), { target: { value: '' } });
      expect(tid('save')).toBeDisabled();
      fireEvent.submit(tid('editor'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('saving', () => {
    it('creates a weekly event', async () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} onClose={mockOnClose} />);
      fireEvent.click(tid('zone-toggle-z1'));
      fireEvent.click(tid('zone-toggle-z2'));
      fireEvent.change(tid('zone-duration-z2'), { target: { value: '30' } });
      fireEvent.click(tid('day-TUE'));
      fireEvent.change(tid('time'), { target: { value: '05:45' } });
      fireEvent.click(tid('save'));

      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(LawnNGardenSubsystem.CMD_CREATEWEEKLYEVENT, SUBSYSTEM, {
        controller: CONTROLLER,
        days: ['TUE'],
        timeOfDay: '05:45:00',
        zoneDurations: [{ zone: 'z1', duration: 10 }, { zone: 'z2', duration: 30 }],
      });
      expect(mockDispatch).toHaveBeenCalledWith(notification('success', 'Your event has been created.'));
    });

    it('updates a weekly event', async () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('day-FRI'));
      fireEvent.click(tid('save'));

      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(LawnNGardenSubsystem.CMD_UPDATEWEEKLYEVENT, SUBSYSTEM, {
        controller: CONTROLLER,
        eventId: 'w1',
        days: ['MON', 'WED', 'FRI'],
        timeOfDay: '06:30:00',
        zoneDurations: [{ zone: 'z2', duration: 5 }, { zone: 'z1', duration: 20 }],
      });
      expect(mockDispatch).toHaveBeenCalledWith(notification('success', 'Your event has been updated.'));
    });

    it('creates an even-day event', async () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} onClose={mockOnClose} />);
      fireEvent.click(tid('zone-toggle-z1'));
      fireEvent.click(tid('save'));

      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      expect(mockBridgeRequest).toHaveBeenCalledWith(LawnNGardenSubsystem.CMD_CREATESCHEDULEEVENT, SUBSYSTEM, {
        controller: CONTROLLER, mode: EVEN, timeOfDay: '07:00:00', zoneDurations: [{ zone: 'z1', duration: 10 }],
      });
    });

    it('updates an odd-day event', async () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={ODD} event={EVEN_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('save'));
      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(LawnNGardenSubsystem.CMD_UPDATESCHEDULEEVENT, SUBSYSTEM, {
        controller: CONTROLLER, mode: ODD, eventId: 'e1', timeOfDay: '18:00:00', zoneDurations: [{ zone: 'z1', duration: 10 }],
      });
    });

    it('configures an unconfigured interval schedule before adding the first event', async () => {
      mockState = makeIrrigationState({ intervalDays: 1, intervalConfigured: false });
      render(<IrrigationEventEditor address={CONTROLLER} mode={INTERVAL} onClose={mockOnClose} />);
      fireEvent.click(tid('zone-toggle-z1'));
      fireEvent.click(tid('save'));

      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenNthCalledWith(1, LawnNGardenSubsystem.CMD_CONFIGUREINTERVALSCHEDULE, SUBSYSTEM, {
        controller: CONTROLLER, startTime: NOW, days: 1,
      });
      expect(mockBridgeRequest).toHaveBeenNthCalledWith(2, LawnNGardenSubsystem.CMD_CREATESCHEDULEEVENT, SUBSYSTEM, {
        controller: CONTROLLER, mode: INTERVAL, timeOfDay: '07:00:00', zoneDurations: [{ zone: 'z1', duration: 10 }],
      });
    });

    it('does not reconfigure a configured interval schedule', async () => {
      mockState = makeIrrigationState({ intervalDays: 3, intervalConfigured: true });
      render(<IrrigationEventEditor address={CONTROLLER} mode={INTERVAL} event={EVEN_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('save'));
      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      expect(mockBridgeRequest.mock.calls[0][0]).toBe(LawnNGardenSubsystem.CMD_UPDATESCHEDULEEVENT);
    });

    it('shows the saving state', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={EVEN_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('save'));
      await waitFor(() => expect(tid('save')).toBeDisabled());
      expect(tid('save')).toHaveTextContent('Saving…');
    });

    it('explains an overlapping start time', async () => {
      mockBridgeRequest.mockRejectedValueOnce({ code: IRRIGATION_ERROR_HAS_OVERLAPS, message: 'overlap' });
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={EVEN_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('save'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        payload: expect.objectContaining({ type: 'error', message: expect.stringContaining('overlaps') }),
      })));
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(tid('save')).toBeEnabled();
    });

    it('shows a generic error when creating fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} onClose={mockOnClose} />);
      fireEvent.click(tid('zone-toggle-z1'));
      fireEvent.click(tid('save'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
        notification('error', 'Failed to create the event. Please try again later.'),
      ));
    });

    it('does not save without a lawn & garden subsystem', () => {
      mockState = makeIrrigationState({ subsystemAddress: undefined });
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={EVEN_EVENT} onClose={mockOnClose} />);
      expect(tid('save')).toBeDisabled();
      fireEvent.submit(tid('editor'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('closes on cancel', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} onClose={mockOnClose} />);
      fireEvent.click(tid('cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('deleting', () => {
    it('asks for confirmation and can back out', () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('delete'));
      expect(tid('confirm-delete')).toBeInTheDocument();
      fireEvent.click(tid('delete-cancel'));
      expect(queryTid('confirm-delete')).not.toBeInTheDocument();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('removes a weekly event', async () => {
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('delete'));
      fireEvent.click(tid('delete-confirm'));
      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      expect(mockBridgeRequest).toHaveBeenCalledWith(LawnNGardenSubsystem.CMD_REMOVEWEEKLYEVENT, SUBSYSTEM, {
        controller: CONTROLLER, eventId: 'w1',
      });
    });

    it('removes the last event of the active mode and falls back to manual', async () => {
      mockState = makeIrrigationState({
        activeMode: EVEN,
        eventsByMode: { [WEEKLY]: [], [INTERVAL]: [], [EVEN]: [EVEN_EVENT], [ODD]: [] },
      });
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={EVEN_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('delete'));
      fireEvent.click(tid('delete-confirm'));
      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenNthCalledWith(1, LawnNGardenSubsystem.CMD_REMOVESCHEDULEEVENT, SUBSYSTEM, {
        controller: CONTROLLER, mode: EVEN, eventId: 'e1',
      });
      expect(mockBridgeRequest).toHaveBeenNthCalledWith(2, LawnNGardenSubsystem.CMD_DISABLESCHEDULING, SUBSYSTEM, {
        controller: CONTROLLER,
      });
    });

    it('keeps scheduling when the removed event is not from the active mode', async () => {
      mockState = makeIrrigationState({
        activeMode: WEEKLY,
        eventsByMode: { [WEEKLY]: [WEEKLY_EVENT], [INTERVAL]: [], [EVEN]: [EVEN_EVENT], [ODD]: [] },
      });
      render(<IrrigationEventEditor address={CONTROLLER} mode={EVEN} event={EVEN_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('delete'));
      fireEvent.click(tid('delete-confirm'));
      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
    });

    it('shows the deleting state', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('delete'));
      fireEvent.click(tid('delete-confirm'));
      await waitFor(() => expect(tid('delete-confirm')).toBeDisabled());
      expect(tid('delete-confirm')).toHaveTextContent('Deleting…');
    });

    it('shows an error when deleting fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<IrrigationEventEditor address={CONTROLLER} mode={WEEKLY} event={WEEKLY_EVENT} onClose={mockOnClose} />);
      fireEvent.click(tid('delete'));
      fireEvent.click(tid('delete-confirm'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
        notification('error', 'Failed to delete the event. Please try again later.'),
      ));
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(queryTid('confirm-delete')).not.toBeInTheDocument();
    });
  });
});
