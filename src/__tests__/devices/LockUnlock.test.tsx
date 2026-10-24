import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, DeviceAdvanced, DoorLock } from '@arcus/core';
import LockUnlock from '@/components/devices/LockUnlock';
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

const ADDRESS = 'DRIV:dev:lock';
const JAM = { WARN_JAM: 'Door lock may be jammed' };

function makeLock(lockState?: string, errors?: Record<string, string>): DeviceEntity {
  return {
    id: ADDRESS,
    [Base.ATTR_ADDRESS]: ADDRESS,
    ...(lockState !== undefined && { [DoorLock.ATTR_LOCKSTATE]: lockState }),
    ...(errors && { [DeviceAdvanced.ATTR_ERRORS]: errors }),
  };
}

function getButton() {
  return screen.getByTestId(`device-lock-toggle-${ADDRESS}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKED);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('LockUnlock', () => {
  describe('snapshots', () => {
    it('matches snapshot', () => {
      const { container } = render(<LockUnlock address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when jammed', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING, JAM);
      const { container } = render(<LockUnlock address={ADDRESS} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('rendering', () => {
    it('offers "Unlock" when locked', () => {
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unlock');
      expect(getButton()).toBeEnabled();
      expect(screen.queryByTestId(`device-lock-jammed-${ADDRESS}`)).not.toBeInTheDocument();
    });

    it('offers "Lock" when unlocked', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED);
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).toBeEnabled();
    });

    it('shows "Locking" and disables the button while locking', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING);
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Locking');
      expect(getButton()).toBeDisabled();
    });

    it('shows "Unlocking" and disables the button while unlocking', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKING);
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unlocking');
      expect(getButton()).toBeDisabled();
    });

    it('shows a jammed indicator and keeps "Unlock" available when the lock is jammed mid-transition', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING, JAM);
      render(<LockUnlock address={ADDRESS} />);
      expect(screen.getByTestId(`device-lock-jammed-${ADDRESS}`)).toHaveTextContent('Jammed');
      expect(screen.getByTestId(`device-lock-jammed-${ADDRESS}`)).toHaveAttribute('title', JAM.WARN_JAM);
      expect(getButton()).toHaveTextContent('Unlock');
      expect(getButton()).toBeEnabled();
    });

    it('offers "Unlock" for a jammed lock that reports unlocked', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED, JAM);
      render(<LockUnlock address={ADDRESS} />);
      expect(screen.getByTestId(`device-lock-jammed-${ADDRESS}`)).toBeInTheDocument();
      expect(getButton()).toHaveTextContent('Unlock');
    });

    it('ignores unrelated device errors', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKING, { WARN_BATTERY: 'Low battery' });
      render(<LockUnlock address={ADDRESS} />);
      expect(screen.queryByTestId(`device-lock-jammed-${ADDRESS}`)).not.toBeInTheDocument();
      expect(getButton()).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('sends UNLOCKED when toggling a locked device', async () => {
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_UNLOCKED);
      });
    });

    it('sends LOCKED when toggling an unlocked device', async () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED);
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_LOCKED);
      });
    });

    it('sends UNLOCKED for a jammed lock', async () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING, JAM);
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_UNLOCKED);
      });
    });

    it('disables the button while the request is in flight and re-enables it afterwards', async () => {
      let resolve: (value: unknown) => void = () => {};
      mockSetAttribute.mockReturnValue(new Promise((r) => { resolve = r; }));
      render(<LockUnlock address={ADDRESS} />);
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

    it('shows an error toast when locking fails', async () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED);
      mockSetAttribute.mockRejectedValue(new Error('timeout'));
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to lock the door' },
        });
      });
      expect(getButton()).toBeEnabled();
      expect(getButton()).toHaveTextContent('Lock');
    });

    it('shows an error toast when unlocking fails', async () => {
      mockSetAttribute.mockRejectedValue(new Error('timeout'));
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to unlock the door' },
        });
      });
    });

    it.each([
      DoorLock.LOCKSTATE_LOCKING,
      DoorLock.LOCKSTATE_UNLOCKING,
    ])('does not send anything when clicked in the %s state', (state) => {
      mockDevice = makeLock(state);
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('disables the control when the lock state is unknown', () => {
      mockDevice = makeLock();
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });

    it('disables the control when the device is not in the store', () => {
      mockDevice = undefined;
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });
  });
});
