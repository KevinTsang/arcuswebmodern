import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Valve } from '@arcus/core';
import OpenCloseValve from '@/components/devices/OpenCloseValve';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

/** base:SetAttributes answers with an empty object. */
type SetAttributesResponse = Record<string, never>;

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
  return makeDevice(ADDRESS, {
    ...(valveState !== undefined && { [Valve.ATTR_VALVESTATE]: valveState }),
  });
}

function getButton() {
  return screen.getByTestId(`device-valve-toggle-${ADDRESS}`);
}

function queryStateText() {
  return screen.queryByTestId(`device-valve-state-${ADDRESS}`);
}

function queryHint() {
  return screen.queryByTestId(`device-valve-hint-${ADDRESS}`);
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
      expect(queryStateText()).not.toBeInTheDocument();
      expect(queryHint()).not.toBeInTheDocument();
    });

    it('offers "Open" when the valve is closed', () => {
      mockDevice = makeValve(Valve.VALVESTATE_CLOSED);
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Open');
      expect(getButton()).toBeEnabled();
      expect(queryStateText()).not.toBeInTheDocument();
    });

    it('shows "Closing" and offers "Close" again, never "Open", while the valve is closing', () => {
      mockDevice = makeValve(Valve.VALVESTATE_CLOSING);
      render(<OpenCloseValve address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Closing');
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
    });

    it('shows "Opening" and keeps "Close" available while the valve is opening', () => {
      mockDevice = makeValve(Valve.VALVESTATE_OPENING);
      render(<OpenCloseValve address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Opening');
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
    });

    it('shows "Obstructed" with a visible explanation and keeps "Close" available', () => {
      mockDevice = makeValve(Valve.VALVESTATE_OBSTRUCTION);
      render(<OpenCloseValve address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Obstructed');
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
      expect(queryHint()).toBeVisible();
      expect(queryHint()).toHaveTextContent('Try Close again');
      expect(getButton()).toHaveAccessibleDescription(/Try Close again/);
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

    it.each([
      Valve.VALVESTATE_CLOSING,
      Valve.VALVESTATE_OPENING,
      Valve.VALVESTATE_OBSTRUCTION,
      'STUCK',
    ])('sends CLOSED when clicked in the %s state', async (state) => {
      mockDevice = makeValve(state);
      render(<OpenCloseValve address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(Valve.ATTR_VALVESTATE, Valve.VALVESTATE_CLOSED);
      });
      expect(mockSetAttribute).toHaveBeenCalledTimes(1);
    });

    it('disables the button while the request is in flight and re-enables it afterwards', async () => {
      let resolve: (value: SetAttributesResponse) => void = () => {};
      mockSetAttribute.mockReturnValue(new Promise<SetAttributesResponse>((r) => { resolve = r; }));
      render(<OpenCloseValve address={ADDRESS} />);
      fireEvent.click(getButton());
      expect(getButton()).toHaveTextContent('...');
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
  });

  describe('edge cases', () => {
    it('offers "Close" when the valve state is unknown', () => {
      mockDevice = makeValve();
      render(<OpenCloseValve address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Unknown');
      expect(getButton()).toHaveTextContent('Close');
      expect(getButton()).toBeEnabled();
    });

    it('treats an inherited property name as an unknown state', () => {
      mockDevice = makeValve('toString');
      render(<OpenCloseValve address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Unknown');
      expect(getButton()).toHaveTextContent('Close');
    });

    it('disables the control when the device is not in the store', () => {
      mockDevice = undefined;
      render(<OpenCloseValve address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });
  });
});
