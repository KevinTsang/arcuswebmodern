import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Somfyv1 } from '@arcus/core';
import BlindStateControl, { BLIND_COOLDOWN_MS } from '@/components/devices/BlindStateControl';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSendCommand = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: jest.fn(),
    sendCommand: mockSendCommand,
  }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:blind';

function makeBlind(type?: string): DeviceEntity {
  return makeDevice(ADDRESS, {
    ...(type !== undefined && { [Somfyv1.ATTR_TYPE]: type }),
    [Somfyv1.ATTR_CURRENTSTATE]: Somfyv1.CURRENTSTATE_OPEN,
  });
}

function error(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

const openButton = () => screen.getByTestId(`device-blind-open-${ADDRESS}`);
const closeButton = () => screen.getByTestId(`device-blind-close-${ADDRESS}`);
const favoriteButton = () => screen.getByTestId(`device-blind-favorite-${ADDRESS}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockSendCommand.mockResolvedValue({});
  mockDevice = makeBlind(Somfyv1.TYPE_BLIND);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('BlindStateControl', () => {
  describe('snapshots', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<BlindStateControl address={ADDRESS} />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('labels the buttons Open/Close for blinds', () => {
      render(<BlindStateControl address={ADDRESS} />);
      expect(openButton()).toHaveTextContent('Open');
      expect(closeButton()).toHaveTextContent('Close');
      expect(favoriteButton()).toHaveTextContent('Favorite');
      expect(screen.getByRole('group', { name: 'Blind position' })).toBeInTheDocument();
    });

    it('labels the buttons Up/Down for shades', () => {
      mockDevice = makeBlind(Somfyv1.TYPE_SHADE);
      render(<BlindStateControl address={ADDRESS} />);
      expect(openButton()).toHaveTextContent('Up');
      expect(closeButton()).toHaveTextContent('Down');
    });
  });

  describe('commands', () => {
    it.each([
      ['open', openButton, Somfyv1.CMD_GOTOOPEN],
      ['close', closeButton, Somfyv1.CMD_GOTOCLOSED],
      ['favorite', favoriteButton, Somfyv1.CMD_GOTOFAVORITE],
    ])('sends the %s command', async (_name, button, command) => {
      render(<BlindStateControl address={ADDRESS} />);
      fireEvent.click(button());
      await act(() => mockSendCommand.mock.results[0].value);
      expect(mockSendCommand).toHaveBeenCalledWith(command);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('disables Open/Close for the cooldown after a command, but not Favorite', async () => {
      jest.useFakeTimers();
      render(<BlindStateControl address={ADDRESS} />);

      fireEvent.click(openButton());
      await act(() => mockSendCommand.mock.results[0].value);
      expect(openButton()).toBeDisabled();
      expect(closeButton()).toBeDisabled();
      expect(favoriteButton()).toBeEnabled();

      act(() => { jest.advanceTimersByTime(BLIND_COOLDOWN_MS); });
      expect(openButton()).toBeEnabled();
      expect(closeButton()).toBeEnabled();
    });

    it('restarts the cooldown when Favorite is pressed during it', async () => {
      jest.useFakeTimers();
      render(<BlindStateControl address={ADDRESS} />);

      fireEvent.click(openButton());
      act(() => { jest.advanceTimersByTime(BLIND_COOLDOWN_MS - 1000); });
      fireEvent.click(favoriteButton());
      act(() => { jest.advanceTimersByTime(1000); });
      expect(openButton()).toBeDisabled();

      act(() => { jest.advanceTimersByTime(BLIND_COOLDOWN_MS); });
      expect(openButton()).toBeEnabled();
      await act(() => mockSendCommand.mock.results[1].value);
    });

    it('clears the cooldown timer on unmount', () => {
      jest.useFakeTimers();
      const { unmount } = render(<BlindStateControl address={ADDRESS} />);
      fireEvent.click(closeButton());
      unmount();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('failure', () => {
    it.each([
      ['open', openButton, 'Failed to open the blinds'],
      ['close', closeButton, 'Failed to close the blinds'],
      ['favorite', favoriteButton, 'Failed to move the blinds to their favorite position'],
    ])('notifies when %s fails', async (_name, button, message) => {
      mockSendCommand.mockRejectedValueOnce(new Error('fail'));
      render(<BlindStateControl address={ADDRESS} />);
      fireEvent.click(button());
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error(message)));
    });
  });

  describe('edge cases', () => {
    it('defaults to Up/Down without a type', () => {
      mockDevice = makeBlind();
      render(<BlindStateControl address={ADDRESS} />);
      expect(openButton()).toHaveTextContent('Up');
    });

    it('renders without a device', () => {
      mockDevice = undefined;
      render(<BlindStateControl address={ADDRESS} />);
      expect(closeButton()).toHaveTextContent('Down');
    });
  });
});
