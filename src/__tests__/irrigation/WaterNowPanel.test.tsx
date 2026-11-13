import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IrrigationController } from '@arcus/core';
import { WaterNowPanel } from '@/components/irrigation/WaterNowPanel';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import { CONTROLLER, makeIrrigationState, makeZone } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
const mockCloseRight = jest.fn();
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
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/hooks/useIrrigationController', () => ({
  useIrrigationController: () => mockState,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to start watering' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockState = makeIrrigationState();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterNowPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterNowPanel address={CONTROLLER} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the controller name, zones and durations', () => {
      render(<WaterNowPanel address={CONTROLLER} />);
      expect(screen.getByText('Backyard Sprinklers')).toBeInTheDocument();
      expect(screen.getByTestId('water-now-zone')).toHaveValue('z1');
      expect(screen.getByRole('option', { name: 'Back Lawn' })).toBeInTheDocument();
      expect(screen.getByTestId('water-now-duration')).toHaveValue('10');
      expect(screen.getByRole('option', { name: '4 hrs' })).toBeInTheDocument();
    });

    it('hides the zone picker for a single-zone controller', () => {
      mockState = makeIrrigationState({ zones: [makeZone(1)] });
      render(<WaterNowPanel address={CONTROLLER} />);
      expect(screen.queryByTestId('water-now-zone')).not.toBeInTheDocument();
    });

    it('defaults the duration to the zone default when it is selectable', () => {
      mockState = makeIrrigationState({ zones: [makeZone(1, { defaultDuration: 25 })] });
      render(<WaterNowPanel address={CONTROLLER} />);
      expect(screen.getByTestId('water-now-duration')).toHaveValue('25');
    });

    it('falls back to 10 minutes for a non-standard default duration', () => {
      mockState = makeIrrigationState({ zones: [makeZone(1, { defaultDuration: 17 })] });
      render(<WaterNowPanel address={CONTROLLER} />);
      expect(screen.getByTestId('water-now-duration')).toHaveValue('10');
    });
  });

  describe('interactions', () => {
    it('starts watering the chosen zone for the chosen duration', async () => {
      render(<WaterNowPanel address={CONTROLLER} />);
      fireEvent.change(screen.getByTestId('water-now-zone'), { target: { value: 'z2' } });
      fireEvent.change(screen.getByTestId('water-now-duration'), { target: { value: '30' } });
      fireEvent.click(screen.getByTestId('water-now-save'));

      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        IrrigationController.CMD_WATERNOWV2, CONTROLLER, { zone: 'z2', duration: 30 },
      );
    });

    it('shows the in-flight state while starting', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<WaterNowPanel address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('water-now-save'));
      await waitFor(() => expect(screen.getByTestId('water-now-save')).toBeDisabled());
      expect(screen.getByTestId('water-now-save')).toHaveTextContent('Starting…');
    });

    it('shows an error and stays open when starting fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<WaterNowPanel address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('water-now-save'));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
      expect(mockCloseRight).not.toHaveBeenCalled();
      expect(screen.getByTestId('water-now-save')).not.toBeDisabled();
    });

    it('closes on cancel', () => {
      render(<WaterNowPanel address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('water-now-cancel'));
      expect(mockCloseRight).toHaveBeenCalled();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('shows a message when the controller has no zones', () => {
      mockState = makeIrrigationState({ zones: [], device: undefined });
      render(<WaterNowPanel address={CONTROLLER} />);
      expect(screen.getByTestId('water-now-no-zones')).toBeInTheDocument();
      expect(screen.queryByTestId('water-now-save')).not.toBeInTheDocument();
    });
  });
});
