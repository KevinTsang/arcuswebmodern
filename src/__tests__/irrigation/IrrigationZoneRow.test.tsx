import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IrrigationController } from '@arcus/core';
import { IrrigationZoneRow } from '@/components/irrigation/IrrigationZoneRow';
import { CONTROLLER, makeZone } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();

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

// ── Helpers ───────────────────────────────────────────────────────────

const KEY = `${CONTROLLER}-z1`;
const IDLE = makeZone(1, { name: 'Front Lawn', defaultDuration: 15 });
const WATERING = makeZone(1, { name: 'Front Lawn', watering: true, wateringDuration: 20 });

function tid(name: string) {
  return screen.getByTestId(`irrigation-zone-${name}-${KEY}`);
}

function error(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationZoneRow', () => {
  describe('snapshots', () => {
    it('matches snapshot when idle', () => {
      const { asFragment } = render(<IrrigationZoneRow address={CONTROLLER} zone={IDLE} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot when watering', () => {
      const { asFragment } = render(<IrrigationZoneRow address={CONTROLLER} zone={WATERING} />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('shows an idle zone with its default duration', () => {
      render(<IrrigationZoneRow address={CONTROLLER} zone={IDLE} />);
      expect(tid('name')).toHaveTextContent('Front Lawn');
      expect(tid('status')).toHaveTextContent('Idle');
      expect(tid('duration')).toHaveValue('15');
      expect(screen.getByTestId(`irrigation-zone-${KEY}`)).toHaveAttribute('data-state', 'idle');
    });

    it('shows a watering zone with its duration and a Stop button', () => {
      render(<IrrigationZoneRow address={CONTROLLER} zone={WATERING} />);
      expect(tid('status')).toHaveTextContent('Watering · 20 min');
      expect(tid('stop')).toBeInTheDocument();
      expect(screen.queryByTestId(`irrigation-zone-start-${KEY}`)).not.toBeInTheDocument();
    });

    it('omits the duration when a watering zone reports none', () => {
      render(<IrrigationZoneRow address={CONTROLLER} zone={{ ...WATERING, wateringDuration: 0 }} />);
      expect(tid('status')).toHaveTextContent(/^Watering$/);
    });
  });

  describe('interactions', () => {
    it('starts the zone for the chosen duration', async () => {
      render(<IrrigationZoneRow address={CONTROLLER} zone={IDLE} />);
      fireEvent.change(tid('duration'), { target: { value: '45' } });
      fireEvent.click(tid('start'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        IrrigationController.CMD_WATERNOWV2, CONTROLLER, { zone: 'z1', duration: 45 },
      ));
      await waitFor(() => expect(tid('start')).toBeEnabled());
    });

    it('disables the controls while starting', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<IrrigationZoneRow address={CONTROLLER} zone={IDLE} />);
      fireEvent.click(tid('start'));
      await waitFor(() => expect(tid('start')).toBeDisabled());
      expect(tid('duration')).toBeDisabled();
    });

    it('shows an error when starting fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<IrrigationZoneRow address={CONTROLLER} zone={IDLE} />);
      fireEvent.click(tid('start'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to start watering Front Lawn')));
    });

    it('stops the zone', async () => {
      render(<IrrigationZoneRow address={CONTROLLER} zone={WATERING} />);
      fireEvent.click(tid('stop'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        IrrigationController.CMD_CANCELV2, CONTROLLER, { zone: 'z1' },
      ));
    });

    it('shows an error when stopping fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<IrrigationZoneRow address={CONTROLLER} zone={WATERING} />);
      fireEvent.click(tid('stop'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to stop watering Front Lawn')));
    });
  });

  describe('edge cases', () => {
    it('disables starting when disabled', () => {
      render(<IrrigationZoneRow address={CONTROLLER} zone={IDLE} disabled />);
      expect(tid('start')).toBeDisabled();
      expect(tid('duration')).toBeDisabled();
    });

    it('defaults to 10 minutes when the default duration is not selectable', () => {
      render(<IrrigationZoneRow address={CONTROLLER} zone={{ ...IDLE, defaultDuration: 17 }} />);
      expect(tid('duration')).toHaveValue('10');
    });
  });
});
