import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DeviceAdvanced, MotorizedDoor } from '@arcus/core';
import OpenCloseDoor, { DOOR_COMMAND_TIMEOUT_MS } from '@/components/devices/OpenCloseDoor';
import { ERR_OBSTRUCTION } from '@/lib/garageDoorStatus';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

/** base:SetAttributes answers with an empty object. */
type SetAttributesResponse = Record<string, never>;

const mockSetAttribute = jest.fn();
const mockSendCommand = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
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

const ADDRESS = 'DRIV:dev:garage';
const OBSTRUCTED = { [ERR_OBSTRUCTION]: 'Garage door may be obstructed' };

function makeDoor(doorState?: string, errors?: Record<string, string>): DeviceEntity {
  return makeDevice(ADDRESS, {
    ...(doorState !== undefined && { [MotorizedDoor.ATTR_DOORSTATE]: doorState }),
    ...(errors && { [DeviceAdvanced.ATTR_ERRORS]: errors }),
  });
}

function getButton() {
  return screen.getByTestId(`device-door-toggle-${ADDRESS}`);
}

function queryStateText() {
  return screen.queryByTestId(`device-door-state-${ADDRESS}`);
}

function queryHint() {
  return screen.queryByTestId(`device-door-hint-${ADDRESS}`);
}

/** Make the next write hang until the returned function is called. */
function deferWrite(): () => void {
  let resolve: (value: SetAttributesResponse) => void = () => {};
  mockSetAttribute.mockReturnValueOnce(new Promise<SetAttributesResponse>((r) => { resolve = r; }));
  return () => resolve({});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSED);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('OpenCloseDoor', () => {
  describe('snapshots', () => {
    it('matches snapshot', () => {
      const { container } = render(<OpenCloseDoor address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot while closing', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSING);
      const { container } = render(<OpenCloseDoor address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when obstructed', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OBSTRUCTION, OBSTRUCTED);
      const { container } = render(<OpenCloseDoor address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('offers "Open" when the door is closed', () => {
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Open');
      expect(getButton()).toBeEnabled();
      expect(queryStateText()).not.toBeInTheDocument();
      expect(queryHint()).not.toBeInTheDocument();
    });

    it('offers "Close" when the door is open', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPEN);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
      expect(queryStateText()).not.toBeInTheDocument();
    });

    it('shows "Opening" and keeps "Close" available while the door is opening', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPENING);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Opening');
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
    });

    it('shows "Closing" and offers "Close" again, never "Open", while the door is closing', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSING);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Closing');
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
    });

    it('disables the control and explains why while devadv:errors has ERR_OBSTRUCTION', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OBSTRUCTION, OBSTRUCTED);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Obstructed');
      expect(getButton()).toBeDisabled();
      expect(queryHint()).toBeVisible();
      expect(queryHint()).toHaveTextContent('operate the door manually');
      expect(getButton()).toHaveAccessibleDescription(/operate the door manually/);
      expect(getButton()).not.toHaveClass('disabled:opacity-50');
    });

    it('treats ERR_OBSTRUCTION as obstructed even when the door reports a settled state', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSED, OBSTRUCTED);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Obstructed');
      expect(getButton()).toBeDisabled();
    });

    it('detects ERR_OBSTRUCTION by key, even with an empty message', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPEN, { [ERR_OBSTRUCTION]: '' });
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Obstructed');
      expect(getButton()).toBeDisabled();
    });

    it('offers "Close" for an OBSTRUCTION doorstate without ERR_OBSTRUCTION, which the drivers accept', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OBSTRUCTION);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Obstructed');
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
      expect(queryHint()).toHaveTextContent('Make sure the doorway is clear');
    });

    it('ignores unrelated device errors', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSED, { WARN_BATTERY: 'Low battery' });
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Open');
      expect(getButton()).toBeEnabled();
      expect(queryHint()).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('writes motdoor:doorstate OPEN when opening a closed door', async () => {
      render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(MotorizedDoor.ATTR_DOORSTATE, MotorizedDoor.DOORSTATE_OPEN);
      });
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it('writes motdoor:doorstate CLOSED when closing an open door', async () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPEN);
      render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(MotorizedDoor.ATTR_DOORSTATE, MotorizedDoor.DOORSTATE_CLOSED);
      });
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it.each([
      MotorizedDoor.DOORSTATE_OPENING,
      MotorizedDoor.DOORSTATE_CLOSING,
      MotorizedDoor.DOORSTATE_OBSTRUCTION,
      'STOPPED',
    ])('writes CLOSED when clicked in the %s state', async (state) => {
      mockDevice = makeDoor(state);
      render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(MotorizedDoor.ATTR_DOORSTATE, MotorizedDoor.DOORSTATE_CLOSED);
      });
      expect(mockSetAttribute).toHaveBeenCalledTimes(1);
    });

    it('stays busy after the platform acks until the door reports a new state', async () => {
      const ack = deferWrite();
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPEN);
      const { rerender } = render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      expect(getButton()).toHaveTextContent('...');
      expect(getButton()).toBeDisabled();

      await act(async () => { ack(); });
      expect(getButton()).toHaveTextContent('...');
      expect(getButton()).toBeDisabled();

      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSING);
      rerender(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
      expect(queryStateText()).toHaveTextContent('Closing');
      expect(mockSetAttribute).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('re-enables the control when the door never reports a new state', async () => {
      jest.useFakeTimers();
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPEN);
      render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      await act(async () => {});
      expect(getButton()).toBeDisabled();

      act(() => { jest.advanceTimersByTime(DOOR_COMMAND_TIMEOUT_MS - 1); });
      expect(getButton()).toBeDisabled();

      act(() => { jest.advanceTimersByTime(1); });
      expect(getButton()).toBeEnabled();
      expect(getButton()).toHaveTextContent('Close');
    });

    it('shows an error toast and re-enables the control when closing fails', async () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPEN);
      mockSetAttribute.mockRejectedValue(new Error('UnsupportedMessageType'));
      render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to close the garage door' },
        });
      });
      expect(getButton()).toBeEnabled();
      expect(getButton()).toHaveTextContent('Close');
    });

    it('shows an error toast when opening fails', async () => {
      mockSetAttribute.mockRejectedValue(new Error('timeout'));
      render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to open the garage door' },
        });
      });
    });
  });

  describe('edge cases', () => {
    it('offers "Close" when the door state is unknown', () => {
      mockDevice = makeDoor();
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Unknown');
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
    });

    it('treats an inherited property name as an unknown state', () => {
      mockDevice = makeDoor('constructor');
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Unknown');
      expect(getButton()).toHaveTextContent('Close');
    });

    it('disables the control when the device is not in the store', () => {
      mockDevice = undefined;
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });
  });
});
