import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpaceHeater, TwinStar } from '@arcus/core';
import SpaceHeaterControl from '@/components/devices/SpaceHeaterControl';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:heater';
const mockSetAttribute = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    setAttributes: jest.fn(),
    sendCommand: jest.fn(),
  }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: { type: string; message: string }) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const c = (f: number) => (f - 32) * 5 / 9;

function heater(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDR, {
    [SpaceHeater.ATTR_HEATSTATE]: SpaceHeater.HEATSTATE_ON,
    [SpaceHeater.ATTR_SETPOINT]: c(70),
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue(undefined);
  mockDevice = heater();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SpaceHeaterControl', () => {
  describe('rendering', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<SpaceHeaterControl address={ADDR} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('shows the setpoint while heating', () => {
      render(<SpaceHeaterControl address={ADDR} />);
      expect(screen.getByTestId(`spaceheater-value-${ADDR}`)).toHaveTextContent('70°');
    });

    it('shows Off when the heater is off', () => {
      mockDevice = heater({ [SpaceHeater.ATTR_HEATSTATE]: SpaceHeater.HEATSTATE_OFF });
      render(<SpaceHeaterControl address={ADDR} />);
      expect(screen.getByTestId(`spaceheater-off-${ADDR}`)).toHaveTextContent('Off');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows Eco Mode instead of a setpoint for TwinStar eco mode', () => {
      mockDevice = heater({ [TwinStar.ATTR_ECOMODE]: TwinStar.ECOMODE_ENABLED });
      render(<SpaceHeaterControl address={ADDR} />);
      expect(screen.getByTestId(`spaceheater-eco-${ADDR}`)).toHaveTextContent('Eco Mode');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('raises the setpoint', async () => {
      render(<SpaceHeaterControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`spaceheater-up-${ADDR}`));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(SpaceHeater.ATTR_SETPOINT, expect.closeTo(c(71), 5)));
    });

    it('lowers the setpoint', async () => {
      render(<SpaceHeaterControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`spaceheater-down-${ADDR}`));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(SpaceHeater.ATTR_SETPOINT, expect.closeTo(c(69), 5)));
    });

    it('notifies when the change fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<SpaceHeaterControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`spaceheater-up-${ADDR}`));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to change heater temperature' },
      }));
      expect(screen.getByTestId(`spaceheater-up-${ADDR}`)).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('disables raising at the 96 °F default maximum', () => {
      mockDevice = heater({ [SpaceHeater.ATTR_SETPOINT]: c(96) });
      render(<SpaceHeaterControl address={ADDR} />);
      expect(screen.getByTestId(`spaceheater-up-${ADDR}`)).toBeDisabled();
      expect(screen.getByTestId(`spaceheater-down-${ADDR}`)).toBeEnabled();
    });

    it('disables lowering at the device minimum', () => {
      mockDevice = heater({ [SpaceHeater.ATTR_SETPOINT]: c(60), [SpaceHeater.ATTR_MINSETPOINT]: c(60) });
      render(<SpaceHeaterControl address={ADDR} />);
      expect(screen.getByTestId(`spaceheater-down-${ADDR}`)).toBeDisabled();
    });

    it('renders nothing when the setpoint is unknown', () => {
      mockDevice = heater({ [SpaceHeater.ATTR_SETPOINT]: undefined });
      const { container } = render(<SpaceHeaterControl address={ADDR} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('shows Off when the device is missing', () => {
      mockDevice = undefined;
      render(<SpaceHeaterControl address={ADDR} />);
      expect(screen.getByTestId(`spaceheater-off-${ADDR}`)).toBeInTheDocument();
    });
  });
});
