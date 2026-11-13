import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, SpaceHeater, TwinStar } from '@arcus/core';
import SpaceHeaterModeConfigurator from '@/components/devices/SpaceHeaterModeConfigurator';
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

function heater(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDR, {
    [Base.ATTR_CAPS]: ['spaceheater', TwinStar.NAMESPACE],
    [SpaceHeater.ATTR_HEATSTATE]: SpaceHeater.HEATSTATE_OFF,
    [TwinStar.ATTR_ECOMODE]: TwinStar.ECOMODE_DISABLED,
    ...overrides,
  });
}

function notification(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue(undefined);
  mockDevice = heater();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SpaceHeaterModeConfigurator', () => {
  describe('rendering', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<SpaceHeaterModeConfigurator address={ADDR} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('marks the current state and eco mode', () => {
      render(<SpaceHeaterModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('spaceheater-state-off')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('spaceheater-state-on')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('spaceheater-ecomode-disabled')).toHaveAttribute('aria-pressed', 'true');
    });

    it('hides the eco mode choice for heaters without TwinStar', () => {
      mockDevice = heater({ [Base.ATTR_CAPS]: ['spaceheater'] });
      render(<SpaceHeaterModeConfigurator address={ADDR} />);
      expect(screen.queryByText('Heater Mode')).not.toBeInTheDocument();
      expect(screen.queryByTestId('spaceheater-ecomode-enabled')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('turns the heater on', async () => {
      render(<SpaceHeaterModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('spaceheater-state-on'));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(SpaceHeater.ATTR_HEATSTATE, SpaceHeater.HEATSTATE_ON));
    });

    it('enables eco mode', async () => {
      render(<SpaceHeaterModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('spaceheater-ecomode-enabled'));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(TwinStar.ATTR_ECOMODE, TwinStar.ECOMODE_ENABLED));
    });

    it('notifies when changing the state fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<SpaceHeaterModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('spaceheater-state-on'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(notification('Failed to change heater state')));
    });

    it('notifies when changing eco mode fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<SpaceHeaterModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('spaceheater-ecomode-enabled'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(notification('Failed to change heater mode')));
    });
  });

  describe('edge cases', () => {
    it('ignores clicks on the current state and eco mode', () => {
      render(<SpaceHeaterModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('spaceheater-state-off'));
      fireEvent.click(screen.getByTestId('spaceheater-ecomode-disabled'));
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });

    it('renders state choices with no device', () => {
      mockDevice = undefined;
      render(<SpaceHeaterModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('spaceheater-state-on')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByText('Heater Mode')).not.toBeInTheDocument();
    });
  });
});
