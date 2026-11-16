import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AOSmithWaterHeaterController } from '@arcus/core';
import { WaterHeaterModeConfigurator } from '@/components/devices/WaterHeaterModeConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetAttribute = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({ setAttribute: mockSetAttribute }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:heater';
const ERROR = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Failed to change the water heater mode' },
};

function makeHeater(mode?: string): DeviceEntity {
  return makeDevice(ADDRESS, {
    ...(mode !== undefined && { [AOSmithWaterHeaterController.ATTR_CONTROLMODE]: mode }),
  });
}

const standard = () => screen.getByTestId('water-heater-mode-standard');
const energySmart = () => screen.getByTestId('water-heater-mode-energy_smart');

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeHeater(AOSmithWaterHeaterController.CONTROLMODE_STANDARD);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterHeaterModeConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterHeaterModeConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('marks the current mode as selected', () => {
      render(<WaterHeaterModeConfigurator address={ADDRESS} />);
      expect(standard()).toHaveAttribute('aria-pressed', 'true');
      expect(energySmart()).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByTestId('water-heater-mode-vacation-note')).not.toBeInTheDocument();
    });

    it('explains Vacation mode and selects neither option', () => {
      mockDevice = makeHeater(AOSmithWaterHeaterController.CONTROLMODE_VACATION);
      render(<WaterHeaterModeConfigurator address={ADDRESS} />);
      expect(screen.getByTestId('water-heater-mode-vacation-note')).toBeInTheDocument();
      expect(standard()).toHaveAttribute('aria-pressed', 'false');
      expect(energySmart()).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders with no device', () => {
      mockDevice = undefined;
      render(<WaterHeaterModeConfigurator address={ADDRESS} />);
      expect(standard()).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('interactions', () => {
    it('switches to EnergySmart', async () => {
      render(<WaterHeaterModeConfigurator address={ADDRESS} />);
      fireEvent.click(energySmart());
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(
        AOSmithWaterHeaterController.ATTR_CONTROLMODE,
        AOSmithWaterHeaterController.CONTROLMODE_ENERGY_SMART,
      ));
      await waitFor(() => expect(energySmart()).toBeEnabled());
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does nothing when the current mode is clicked', () => {
      render(<WaterHeaterModeConfigurator address={ADDRESS} />);
      fireEvent.click(standard());
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });

    it('notifies when the change fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<WaterHeaterModeConfigurator address={ADDRESS} />);
      fireEvent.click(energySmart());
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
      await waitFor(() => expect(energySmart()).toBeEnabled());
    });
  });
});
