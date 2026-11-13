import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { IrrigationController, IrrigationScheduleMode, LawnNGardenSubsystem } from '@arcus/core';
import { IrrigationActions } from '@/components/irrigation/IrrigationActions';
import { WaterNowPanel } from '@/components/irrigation/WaterNowPanel';
import { StopWateringPanel } from '@/components/irrigation/StopWateringPanel';
import { SkipWateringPanel } from '@/components/irrigation/SkipWateringPanel';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import { CONTROLLER, SUBSYSTEM, makeIrrigationState, makeZone } from '../helpers/irrigation';

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

function error(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

function openedPanel(): ReactElement {
  return mockOpenRight.mock.calls[0][0];
}

function tid(name: string) {
  return screen.getByTestId(`irrigation-${name}-${CONTROLLER}`);
}

function queryTid(name: string) {
  return screen.queryByTestId(`irrigation-${name}-${CONTROLLER}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockState = makeIrrigationState();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationActions', () => {
  describe('snapshots', () => {
    it('matches snapshot when idle in manual mode', () => {
      const { asFragment } = render(<IrrigationActions address={CONTROLLER} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot when watering on a schedule', () => {
      mockState = makeIrrigationState({ watering: true, activeMode: IrrigationScheduleMode.WEEKLY });
      const { asFragment } = render(<IrrigationActions address={CONTROLLER} />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('shows Water Now and no Skip in manual mode', () => {
      render(<IrrigationActions address={CONTROLLER} />);
      expect(tid('water-now')).toHaveTextContent('Water Now');
      expect(queryTid('stop')).not.toBeInTheDocument();
      expect(queryTid('skip')).not.toBeInTheDocument();
      expect(queryTid('cancel-skip')).not.toBeInTheDocument();
    });

    it('shows Stop while watering and disables Skip', () => {
      mockState = makeIrrigationState({ watering: true, activeMode: IrrigationScheduleMode.EVEN });
      render(<IrrigationActions address={CONTROLLER} />);
      expect(tid('stop')).toBeEnabled();
      expect(queryTid('water-now')).not.toBeInTheDocument();
      expect(tid('skip')).toBeDisabled();
    });

    it('shows Cancel Skip and disables watering while skipped', () => {
      mockState = makeIrrigationState({ activeMode: IrrigationScheduleMode.WEEKLY, skippedUntil: Date.now() + 1000 });
      render(<IrrigationActions address={CONTROLLER} />);
      expect(tid('cancel-skip')).toBeInTheDocument();
      expect(tid('water-now')).toBeDisabled();
      expect(queryTid('skip')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('opens the Water Now panel', () => {
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('water-now'));
      expect(openedPanel().type).toBe(WaterNowPanel);
      expect(mockOpenRight.mock.calls[0][1]).toEqual({ title: 'Water Now', key: `irrigation-water-now:${CONTROLLER}` });
    });

    it('opens the Stop Watering panel for a multi-zone controller', () => {
      mockState = makeIrrigationState({ watering: true });
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('stop'));
      expect(openedPanel().type).toBe(StopWateringPanel);
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('stops a single-zone controller right away', async () => {
      mockState = makeIrrigationState({ watering: true, zones: [makeZone(1)] });
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('stop'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        IrrigationController.CMD_CANCELV2, CONTROLLER, { zone: 'z1' },
      ));
      expect(mockOpenRight).not.toHaveBeenCalled();
      await waitFor(() => expect(tid('stop')).toBeEnabled());
    });

    it('disables Stop while a single-zone stop is in flight', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      mockState = makeIrrigationState({ watering: true, zones: [makeZone(1)] });
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('stop'));
      await waitFor(() => expect(tid('stop')).toBeDisabled());
    });

    it('shows an error when a single-zone stop fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      mockState = makeIrrigationState({ watering: true, zones: [makeZone(1)] });
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('stop'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to stop watering')));
    });

    it('opens the Skip panel', () => {
      mockState = makeIrrigationState({ activeMode: IrrigationScheduleMode.ODD });
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('skip'));
      expect(openedPanel().type).toBe(SkipWateringPanel);
    });

    it('cancels a skip', async () => {
      mockState = makeIrrigationState({ activeMode: IrrigationScheduleMode.WEEKLY, skippedUntil: 123 });
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('cancel-skip'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        LawnNGardenSubsystem.CMD_CANCELSKIP, SUBSYSTEM, { controller: CONTROLLER },
      ));
    });

    it('shows an error when cancelling a skip fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      mockState = makeIrrigationState({ activeMode: IrrigationScheduleMode.WEEKLY, skippedUntil: 123 });
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('cancel-skip'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to cancel skip')));
    });
  });

  describe('edge cases', () => {
    it('disables Water Now when the controller has no zones', () => {
      mockState = makeIrrigationState({ zones: [] });
      render(<IrrigationActions address={CONTROLLER} />);
      expect(tid('water-now')).toBeDisabled();
    });

    it('does not cancel a skip without a lawn & garden subsystem', () => {
      mockState = makeIrrigationState({
        activeMode: IrrigationScheduleMode.WEEKLY, skippedUntil: 123, subsystemAddress: undefined,
      });
      render(<IrrigationActions address={CONTROLLER} />);
      fireEvent.click(tid('cancel-skip'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });
});
