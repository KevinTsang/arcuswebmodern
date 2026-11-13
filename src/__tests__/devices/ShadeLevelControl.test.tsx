import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Shade } from '@arcus/core';
import ShadeLevelControl, { SHADE_SAVE_DELAY_MS } from '@/components/devices/ShadeLevelControl';
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
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    sendCommand: jest.fn(),
  }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:shade';
const MOVE_ERROR = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Failed to move the shade' },
};

function makeShade(attrs: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDRESS, { [Shade.ATTR_LEVEL]: 30, [Shade.ATTR_SHADESTATE]: Shade.SHADESTATE_OK, ...attrs });
}

const levelText = () => screen.getByTestId(`device-shade-level-${ADDRESS}`);
const upButton = () => screen.getByTestId(`device-shade-up-${ADDRESS}`);
const downButton = () => screen.getByTestId(`device-shade-down-${ADDRESS}`);
const queryHint = () => screen.queryByTestId(`device-shade-hint-${ADDRESS}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeShade();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ShadeLevelControl', () => {
  describe('snapshots', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<ShadeLevelControl address={ADDRESS} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot when obstructed', () => {
      mockDevice = makeShade({ [Shade.ATTR_SHADESTATE]: Shade.SHADESTATE_OBSTRUCTION });
      const { asFragment } = render(<ShadeLevelControl address={ADDRESS} />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('shows the reported level with both steppers enabled', () => {
      render(<ShadeLevelControl address={ADDRESS} />);
      expect(levelText()).toHaveTextContent('30%');
      expect(levelText()).toHaveAttribute('data-level', '30');
      expect(screen.getByRole('button', { name: 'Raise shade' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Lower shade' })).toBeEnabled();
      expect(queryHint()).not.toBeInTheDocument();
    });

    it('shows an obstruction hint linked to the control', () => {
      mockDevice = makeShade({ [Shade.ATTR_SHADESTATE]: Shade.SHADESTATE_OBSTRUCTION });
      render(<ShadeLevelControl address={ADDRESS} />);
      expect(queryHint()).toHaveTextContent('obstruction');
      expect(screen.getByRole('group', { name: 'Shade position' }))
        .toHaveAttribute('aria-describedby', `device-shade-hint-${ADDRESS}`);
    });
  });

  describe('stepping', () => {
    it('sends the new level once the user pauses', async () => {
      jest.useFakeTimers();
      render(<ShadeLevelControl address={ADDRESS} />);

      fireEvent.click(upButton());
      expect(levelText()).toHaveTextContent('40%');
      expect(mockSetAttribute).not.toHaveBeenCalled();

      await act(() => jest.advanceTimersByTimeAsync(SHADE_SAVE_DELAY_MS));
      expect(mockSetAttribute).toHaveBeenCalledWith(Shade.ATTR_LEVEL, 40);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('batches several steps into one request', async () => {
      jest.useFakeTimers();
      render(<ShadeLevelControl address={ADDRESS} />);

      fireEvent.click(upButton());
      act(() => { jest.advanceTimersByTime(SHADE_SAVE_DELAY_MS / 2); });
      fireEvent.click(upButton());
      fireEvent.click(upButton());
      expect(levelText()).toHaveTextContent('60%');

      await act(() => jest.advanceTimersByTimeAsync(SHADE_SAVE_DELAY_MS));
      expect(mockSetAttribute).toHaveBeenCalledTimes(1);
      expect(mockSetAttribute).toHaveBeenCalledWith(Shade.ATTR_LEVEL, 60);
    });

    it('lowers the shade', async () => {
      jest.useFakeTimers();
      render(<ShadeLevelControl address={ADDRESS} />);

      fireEvent.click(downButton());
      await act(() => jest.advanceTimersByTimeAsync(SHADE_SAVE_DELAY_MS));
      expect(mockSetAttribute).toHaveBeenCalledWith(Shade.ATTR_LEVEL, 20);
    });

    it('keeps the picked level until the device reports a new one', async () => {
      jest.useFakeTimers();
      const { rerender } = render(<ShadeLevelControl address={ADDRESS} />);

      fireEvent.click(upButton());
      await act(() => jest.advanceTimersByTimeAsync(SHADE_SAVE_DELAY_MS));
      expect(levelText()).toHaveTextContent('40%');

      mockDevice = makeShade({ [Shade.ATTR_LEVEL]: 50 });
      rerender(<ShadeLevelControl address={ADDRESS} />);
      expect(levelText()).toHaveTextContent('50%');
    });

    it('sends a waiting step when it unmounts', () => {
      jest.useFakeTimers();
      const { unmount } = render(<ShadeLevelControl address={ADDRESS} />);

      fireEvent.click(upButton());
      unmount();
      expect(mockSetAttribute).toHaveBeenCalledWith(Shade.ATTR_LEVEL, 40);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('failure', () => {
    it('reverts to the reported level and notifies', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      jest.useFakeTimers();
      render(<ShadeLevelControl address={ADDRESS} />);

      fireEvent.click(upButton());
      await act(() => jest.advanceTimersByTimeAsync(SHADE_SAVE_DELAY_MS));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(MOVE_ERROR));
      expect(levelText()).toHaveTextContent('30%');
    });
  });

  describe('edge cases', () => {
    it('disables Raise when fully open', () => {
      mockDevice = makeShade({ [Shade.ATTR_LEVEL]: 100 });
      render(<ShadeLevelControl address={ADDRESS} />);
      expect(upButton()).toBeDisabled();
      expect(downButton()).toBeEnabled();
    });

    it('disables Lower when fully closed', () => {
      mockDevice = makeShade({ [Shade.ATTR_LEVEL]: 0 });
      render(<ShadeLevelControl address={ADDRESS} />);
      expect(downButton()).toBeDisabled();
      expect(upButton()).toBeEnabled();
    });

    it('snaps an off-step level to the next 10%', async () => {
      mockDevice = makeShade({ [Shade.ATTR_LEVEL]: 33 });
      jest.useFakeTimers();
      render(<ShadeLevelControl address={ADDRESS} />);
      expect(levelText()).toHaveTextContent('33%');

      fireEvent.click(upButton());
      await act(() => jest.advanceTimersByTimeAsync(SHADE_SAVE_DELAY_MS));
      expect(mockSetAttribute).toHaveBeenCalledWith(Shade.ATTR_LEVEL, 40);
    });

    it('shows a placeholder without a level and steps up from closed', async () => {
      mockDevice = makeDevice(ADDRESS);
      jest.useFakeTimers();
      render(<ShadeLevelControl address={ADDRESS} />);
      expect(levelText()).toHaveTextContent('--');
      expect(upButton()).toBeEnabled();
      expect(downButton()).toBeEnabled();

      fireEvent.click(upButton());
      await act(() => jest.advanceTimersByTimeAsync(SHADE_SAVE_DELAY_MS));
      expect(mockSetAttribute).toHaveBeenCalledWith(Shade.ATTR_LEVEL, 10);
    });

    it('renders without a device', () => {
      mockDevice = undefined;
      render(<ShadeLevelControl address={ADDRESS} />);
      expect(levelText()).toHaveTextContent('--');
    });
  });
});
