import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Valve } from '@arcus/core';
import OpenCloseValve from '@/components/devices/OpenCloseValve';
import type { DeviceEntity } from '@/store/entityTypes';

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

const ADDRESS = 'DRIV:dev:valve';

function makeValve(valveState?: string): DeviceEntity {
  return {
    id: ADDRESS,
    [Base.ATTR_ADDRESS]: ADDRESS,
    ...(valveState !== undefined && { [Valve.ATTR_VALVESTATE]: valveState }),
  };
}

function getButton() {
  return screen.getByTestId(`device-valve-toggle-${ADDRESS}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeValve(Valve.VALVESTATE_OPEN);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('OpenCloseValve', () => {
  describe('snapshots', () => {
    it('matches snapshot', () => {
      const { container } = render(<OpenCloseValve address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when obstructed', () => {
      mockDevice = makeValve(Valve.VALVESTATE_OBSTRUCTION);
      const { container } = render(<OpenCloseValve address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('offers "Close" when the valve is open', () => {
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
    });

    it('offers "Open" when the valve is closed', () => {
      mockDevice = makeValve(Valve.VALVESTATE_CLOSED);
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Open');
      expect(getButton()).toBeEnabled();
    });

    it('shows "Closing" and disables the button while the valve is closing', () => {
      mockDevice = makeValve(Valve.VALVESTATE_CLOSING);
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Closing');
      expect(getButton()).toBeDisabled();
    });

    it('shows "Opening" and disables the button while the valve is opening', () => {
      mockDevice = makeValve(Valve.VALVESTATE_OPENING);
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Opening');
      expect(getButton()).toBeDisabled();
    });

    it('shows "Obstructed" and disables the button when the valve is obstructed', () => {
      mockDevice = makeValve(Valve.VALVESTATE_OBSTRUCTION);
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Obstructed');
      expect(getButton()).toBeDisabled();
      expect(getButton()).toHaveAttribute('title', expect.stringContaining('Obstruction detected'));
    });
  });

  describe('interactions', () => {
    it('sends CLOSED when closing an open valve', async () => {
      render(<OpenCloseValve address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(Valve.ATTR_VALVESTATE, Valve.VALVESTATE_CLOSED);
      });
    });

    it('sends OPEN when opening a closed valve', async () => {
      mockDevice = makeValve(Valve.VALVESTATE_CLOSED);
      render(<OpenCloseValve address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(Valve.ATTR_VALVESTATE, Valve.VALVESTATE_OPEN);
      });
    });

    it('disables the button while the request is in flight and re-enables it afterwards', async () => {
      let resolve: (value: unknown) => void = () => {};
      mockSetAttribute.mockReturnValue(new Promise((r) => { resolve = r; }));
      render(<OpenCloseValve address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(getButton()).toHaveTextContent('...');
      });
      expect(getButton()).toBeDisabled();

      resolve({});
      await waitFor(() => {
        expect(getButton()).toBeEnabled();
      });
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('shows an error toast when closing fails', async () => {
      mockSetAttribute.mockRejectedValue(new Error('timeout'));
      render(<OpenCloseValve address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to close the valve' },
        });
      });
      expect(getButton()).toBeEnabled();
      expect(getButton()).toHaveTextContent('Close');
    });

    it('shows an error toast when opening fails', async () => {
      mockDevice = makeValve(Valve.VALVESTATE_CLOSED);
      mockSetAttribute.mockRejectedValue(new Error('timeout'));
      render(<OpenCloseValve address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to open the valve' },
        });
      });
    });

    it.each([
      Valve.VALVESTATE_CLOSING,
      Valve.VALVESTATE_OPENING,
      Valve.VALVESTATE_OBSTRUCTION,
    ])('does not send anything when clicked in the %s state', (state) => {
      mockDevice = makeValve(state);
      render(<OpenCloseValve address={ADDRESS} />);
      fireEvent.click(getButton());
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('disables the control when the valve state is unknown', () => {
      mockDevice = makeValve();
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });

    it('disables the control when the device is not in the store', () => {
      mockDevice = undefined;
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });
  });
});
