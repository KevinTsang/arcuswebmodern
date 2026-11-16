import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaterHeater } from '@arcus/core';
import { WaterHeaterTemperatureControl } from '@/components/devices/WaterHeaterTemperatureControl';
import { fahrenheitToCelsius } from '@/lib/waterDevices';
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
  payload: { type: 'error', message: 'Failed to change the water heater temperature' },
};

function makeHeater(setpointF?: number, maxC = 60): DeviceEntity {
  return makeDevice(ADDRESS, {
    ...(setpointF !== undefined && { [WaterHeater.ATTR_SETPOINT]: fahrenheitToCelsius(setpointF) }),
    [WaterHeater.ATTR_MAXSETPOINT]: maxC,
  });
}

const up = () => screen.getByTestId(`water-heater-up-${ADDRESS}`);
const down = () => screen.getByTestId(`water-heater-down-${ADDRESS}`);
const value = () => screen.getByTestId(`water-heater-setpoint-${ADDRESS}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeHeater(120);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterHeaterTemperatureControl', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterHeaterTemperatureControl address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the setpoint in Fahrenheit', () => {
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      expect(value()).toHaveTextContent('120°');
      expect(up()).toBeEnabled();
      expect(down()).toBeEnabled();
    });

    it('shows a placeholder when the setpoint is not reported', () => {
      mockDevice = makeHeater(undefined);
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      expect(value()).toHaveTextContent('--');
      expect(screen.queryByTestId(`water-heater-up-${ADDRESS}`)).not.toBeInTheDocument();
    });

    it('disables down at the 60° floor', () => {
      mockDevice = makeHeater(60);
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      expect(down()).toBeDisabled();
      expect(up()).toBeEnabled();
    });

    it('disables up at the device max setpoint', () => {
      mockDevice = makeHeater(140, 60);
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      expect(up()).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('raises the setpoint by one degree', async () => {
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      fireEvent.click(up());
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(WaterHeater.ATTR_SETPOINT, fahrenheitToCelsius(121)));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('lowers the setpoint by one degree', async () => {
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      fireEvent.click(down());
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(WaterHeater.ATTR_SETPOINT, fahrenheitToCelsius(119)));
    });

    it('jumps from 80° down to 60°', async () => {
      mockDevice = makeHeater(80);
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      fireEvent.click(down());
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(WaterHeater.ATTR_SETPOINT, fahrenheitToCelsius(60)));
    });

    it('jumps from 60° up to 80°', async () => {
      mockDevice = makeHeater(60);
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      fireEvent.click(up());
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(WaterHeater.ATTR_SETPOINT, fahrenheitToCelsius(80)));
    });

    it('disables the buttons while saving', async () => {
      let resolve!: () => void;
      mockSetAttribute.mockReturnValueOnce(new Promise<void>((r) => { resolve = r; }));
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      fireEvent.click(up());
      await waitFor(() => expect(up()).toBeDisabled());
      expect(down()).toBeDisabled();
      resolve();
      await waitFor(() => expect(up()).toBeEnabled());
    });

    it('notifies when the change fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<WaterHeaterTemperatureControl address={ADDRESS} />);
      fireEvent.click(up());
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
      await waitFor(() => expect(up()).toBeEnabled());
    });
  });
});
