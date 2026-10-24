import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, DeviceAdvanced, MotorizedDoor } from '@arcus/core';
import OpenCloseDoor from '@/components/devices/OpenCloseDoor';
import type { DeviceEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

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

function makeDoor(doorState?: string, errors?: Record<string, string>): DeviceEntity {
  return {
    id: ADDRESS,
    [Base.ATTR_ADDRESS]: ADDRESS,
    ...(doorState !== undefined && { [MotorizedDoor.ATTR_DOORSTATE]: doorState }),
    ...(errors && { [DeviceAdvanced.ATTR_ERRORS]: errors }),
  };
}

function getButton() {
  return screen.getByTestId(`device-door-toggle-${ADDRESS}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSED);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('OpenCloseDoor', () => {
  describe('snapshots', () => {
    it('matches snapshot', () => {
      const { container } = render(<OpenCloseDoor address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when obstructed', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OBSTRUCTION);
      const { container } = render(<OpenCloseDoor address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('offers "Open" when the door is closed', () => {
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Open');
      expect(getButton()).toBeEnabled();
    });

    it('offers "Close" when the door is open', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPEN);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
    });

    it('shows "Opening" and disables the button while the door is opening', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OPENING);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Opening');
      expect(getButton()).toBeDisabled();
    });

    it('shows "Closing" and disables the button while the door is closing', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSING);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Closing');
      expect(getButton()).toBeDisabled();
    });

    it('shows "Obstructed" and disables the button when the door reports an obstruction', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_OBSTRUCTION);
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Obstructed');
      expect(getButton()).toBeDisabled();
      expect(getButton()).toHaveAttribute('title', expect.stringContaining('Obstruction detected'));
    });

    it('treats an ERR_OBSTRUCTION device error as obstructed even if the door state is settled', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSED, { ERR_OBSTRUCTION: 'Garage door may be obstructed' });
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Obstructed');
      expect(getButton()).toBeDisabled();
    });

    it('ignores unrelated device errors', () => {
      mockDevice = makeDoor(MotorizedDoor.DOORSTATE_CLOSED, { WARN_BATTERY: 'Low battery' });
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Open');
      expect(getButton()).toBeEnabled();
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

    it('disables the button while the request is in flight and re-enables it afterwards', async () => {
      let resolve: (value: unknown) => void = () => {};
      mockSetAttribute.mockReturnValue(new Promise((r) => { resolve = r; }));
      render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(getButton()).toHaveTextContent('...');
      });
      expect(getButton()).toBeDisabled();

      resolve({});
      await waitFor(() => {
        expect(getButton()).toBeEnabled();
      });
      expect(getButton()).toHaveTextContent('Open');
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('shows an error toast when closing fails', async () => {
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

    it.each([
      MotorizedDoor.DOORSTATE_OPENING,
      MotorizedDoor.DOORSTATE_CLOSING,
      MotorizedDoor.DOORSTATE_OBSTRUCTION,
    ])('does not send anything when clicked in the %s state', (state) => {
      mockDevice = makeDoor(state);
      render(<OpenCloseDoor address={ADDRESS} />);
      fireEvent.click(getButton());
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('disables the control when the door state is unknown', () => {
      mockDevice = makeDoor();
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });

    it('disables the control when the device is not in the store', () => {
      mockDevice = undefined;
      render(<OpenCloseDoor address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });
  });
});
