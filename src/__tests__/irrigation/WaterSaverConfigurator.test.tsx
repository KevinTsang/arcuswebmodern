import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, IrrigationController } from '@arcus/core';
import { WaterSaverConfigurator } from '@/components/irrigation/WaterSaverConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';
import { CONTROLLER } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

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

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to update water saver' } };

function withBudget(budget?: number): DeviceEntity {
  return makeDevice(CONTROLLER, budget === undefined ? {} : { [IrrigationController.ATTR_BUDGET]: budget });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockDevice = withBudget(70);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterSaverConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterSaverConfigurator address={CONTROLLER} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the current budget', () => {
      render(<WaterSaverConfigurator address={CONTROLLER} />);
      expect(screen.getByTestId('water-saver-value')).toHaveTextContent('70%');
      expect(screen.getByText(/seasonal/i)).toBeInTheDocument();
    });

    it('defaults to 100% when the device has no budget', () => {
      mockDevice = withBudget();
      render(<WaterSaverConfigurator address={CONTROLLER} />);
      expect(screen.getByTestId('water-saver-value')).toHaveTextContent('100%');
      expect(screen.getByTestId('water-saver-increase')).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('decreases the budget by 10%', async () => {
      render(<WaterSaverConfigurator address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('water-saver-decrease'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CONTROLLER, { [IrrigationController.ATTR_BUDGET]: 60 },
      ));
    });

    it('increases the budget by 10%', async () => {
      render(<WaterSaverConfigurator address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('water-saver-increase'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CONTROLLER, { [IrrigationController.ATTR_BUDGET]: 80 },
      ));
    });

    it('shows the new value and disables the buttons while saving', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<WaterSaverConfigurator address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('water-saver-increase'));
      await waitFor(() => expect(screen.getByTestId('water-saver-value')).toHaveTextContent('80%'));
      expect(screen.getByTestId('water-saver-increase')).toBeDisabled();
      expect(screen.getByTestId('water-saver-decrease')).toBeDisabled();
    });

    it('reverts and shows an error when saving fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<WaterSaverConfigurator address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('water-saver-decrease'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
      expect(screen.getByTestId('water-saver-value')).toHaveTextContent('70%');
    });
  });

  describe('edge cases', () => {
    it('disables decreasing at 0%', () => {
      mockDevice = withBudget(0);
      render(<WaterSaverConfigurator address={CONTROLLER} />);
      expect(screen.getByTestId('water-saver-decrease')).toBeDisabled();
      expect(screen.getByTestId('water-saver-increase')).toBeEnabled();
    });

    it('clamps to 100% from an out-of-range value', async () => {
      mockDevice = withBudget(95);
      render(<WaterSaverConfigurator address={CONTROLLER} />);
      fireEvent.click(screen.getByTestId('water-saver-increase'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CONTROLLER, { [IrrigationController.ATTR_BUDGET]: 100 },
      ));
    });
  });
});
