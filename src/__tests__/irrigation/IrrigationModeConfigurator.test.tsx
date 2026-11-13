import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { IrrigationScheduleMode, LawnNGardenSubsystem } from '@arcus/core';
import { IrrigationModeConfigurator } from '@/components/irrigation/IrrigationModeConfigurator';
import { IrrigationSchedulePanel } from '@/components/irrigation/IrrigationSchedulePanel';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import { CONTROLLER, SUBSYSTEM, makeEvent, makeIrrigationState } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
const mockOpenRight = jest.fn();
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

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/hooks/useIrrigationController', () => ({
  useIrrigationController: () => mockState,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to change watering mode' } };

/** Weekly and even schedules have events; interval and odd do not. */
function withEvents(overrides: Partial<IrrigationControllerState> = {}): IrrigationControllerState {
  return makeIrrigationState({
    eventsByMode: {
      [IrrigationScheduleMode.WEEKLY]: [makeEvent('w1', { days: ['MON'] })],
      [IrrigationScheduleMode.INTERVAL]: [],
      [IrrigationScheduleMode.EVEN]: [makeEvent('e1')],
      [IrrigationScheduleMode.ODD]: [],
    },
    ...overrides,
  });
}

function radio(mode: string) {
  return screen.getByTestId(`irrigation-mode-${mode}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockState = withEvents({ activeMode: IrrigationScheduleMode.WEEKLY });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationModeConfigurator', () => {
  describe('snapshots', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<IrrigationModeConfigurator address={CONTROLLER} />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('checks the active mode', () => {
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      expect(radio('weekly')).toBeChecked();
      expect(radio('manual')).not.toBeChecked();
    });

    it('checks Manual when scheduling is disabled', () => {
      mockState = withEvents();
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      expect(radio('manual')).toBeChecked();
    });

    it('disables modes without events and explains why', () => {
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      expect(radio('even')).toBeEnabled();
      expect(radio('interval')).toBeDisabled();
      expect(radio('odd')).toBeDisabled();
      expect(screen.getByTestId('irrigation-mode-needs-events')).toBeInTheDocument();
    });

    it('hides the explanation when every mode has events', () => {
      const event = makeEvent('x');
      mockState = makeIrrigationState({
        eventsByMode: {
          [IrrigationScheduleMode.WEEKLY]: [event],
          [IrrigationScheduleMode.INTERVAL]: [event],
          [IrrigationScheduleMode.EVEN]: [event],
          [IrrigationScheduleMode.ODD]: [event],
        },
      });
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      expect(screen.queryByTestId('irrigation-mode-needs-events')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('switches to another mode and enables scheduling', async () => {
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      fireEvent.click(radio('even'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledTimes(2));
      expect(mockBridgeRequest).toHaveBeenNthCalledWith(
        1, LawnNGardenSubsystem.CMD_SWITCHSCHEDULEMODE, SUBSYSTEM,
        { controller: CONTROLLER, mode: IrrigationScheduleMode.EVEN },
      );
      expect(mockBridgeRequest).toHaveBeenNthCalledWith(
        2, LawnNGardenSubsystem.CMD_ENABLESCHEDULING, SUBSYSTEM, { controller: CONTROLLER },
      );
    });

    it('shows the chosen mode and disables the options while switching', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      fireEvent.click(radio('even'));
      await waitFor(() => expect(radio('even')).toBeChecked());
      expect(radio('manual')).toBeDisabled();
    });

    it('switches to manual by disabling scheduling', async () => {
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      fireEvent.click(radio('manual'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        LawnNGardenSubsystem.CMD_DISABLESCHEDULING, SUBSYSTEM, { controller: CONTROLLER },
      ));
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
    });

    it('shows an error and reverts when switching fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      fireEvent.click(radio('even'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
      await waitFor(() => expect(radio('weekly')).toBeChecked());
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
    });

    it('opens the schedule editor', () => {
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('irrigation-edit-schedule'));
      const panel: ReactElement = mockOpenRight.mock.calls[0][0];
      expect(panel.type).toBe(IrrigationSchedulePanel);
      expect(mockOpenRight.mock.calls[0][1]).toEqual({ title: 'Watering Schedule', key: `irrigation-schedule:${CONTROLLER}` });
    });
  });

  describe('edge cases', () => {
    it('ignores choosing the current mode', () => {
      mockState = withEvents();
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      fireEvent.click(radio('manual'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('does nothing without a lawn & garden subsystem', () => {
      mockState = withEvents({ subsystemAddress: undefined });
      render(<IrrigationModeConfigurator address={CONTROLLER} />);
      fireEvent.click(radio('weekly'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });
});
