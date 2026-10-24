import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceAdvanced, DoorLock } from '@arcus/core';
import LockUnlock from '@/components/devices/LockUnlock';
import { WARN_JAM } from '@/lib/lockStatus';
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

const ADDRESS = 'DRIV:dev:lock';
const JAM = { [WARN_JAM]: 'Door lock may be jammed' };

function makeLock(lockState?: string, errors?: Record<string, string>): DeviceEntity {
  return makeDevice(ADDRESS, {
    ...(lockState !== undefined && { [DoorLock.ATTR_LOCKSTATE]: lockState }),
    ...(errors && { [DeviceAdvanced.ATTR_ERRORS]: errors }),
  });
}

function getButton() {
  return screen.getByTestId(`device-lock-toggle-${ADDRESS}`);
}

function queryStateText() {
  return screen.queryByTestId(`device-lock-state-${ADDRESS}`);
}

function queryHint() {
  return screen.queryByTestId(`device-lock-hint-${ADDRESS}`);
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
      expect(queryStateText()).not.toBeInTheDocument();
      expect(queryHint()).not.toBeInTheDocument();
    });

    it('offers "Lock" when unlocked', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED);
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).toBeEnabled();
      expect(queryStateText()).not.toBeInTheDocument();
    });

    it('shows "Locking" and offers "Lock" again, never "Unlock", while locking', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING);
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Locking');
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).not.toHaveTextContent('Unlock');
      expect(getButton()).toBeEnabled();
    });

    it('shows "Unlocking" and keeps "Lock" available while unlocking', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKING);
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Unlocking');
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).toBeEnabled();
    });

    it('shows "Jammed" with a visible explanation and offers "Lock" when jammed mid-lock', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING, JAM);
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Jammed');
      expect(queryHint()).toBeVisible();
      expect(queryHint()).toHaveTextContent('may be jammed');
      expect(getButton()).toHaveAccessibleDescription(/may be jammed/);
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).not.toHaveTextContent('Unlock');
      expect(getButton()).toBeEnabled();
    });

    it.each([
      DoorLock.LOCKSTATE_UNLOCKED,
      DoorLock.LOCKSTATE_UNLOCKING,
    ])('offers "Lock" for a jammed lock that reports %s', (state) => {
      mockDevice = makeLock(state, JAM);
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Jammed');
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).not.toHaveTextContent('Unlock');
    });

    it('offers "Unlock" for a jammed lock that reports LOCKED', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKED, JAM);
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Jammed');
      expect(getButton()).toHaveTextContent('Unlock');
    });

    it('detects WARN_JAM by key, even with an empty message', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED, { [WARN_JAM]: '' });
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Jammed');
      expect(queryHint()).toBeInTheDocument();
    });

    it('ignores unrelated device errors', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED, { WARN_BATTERY: 'Low battery' });
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).not.toBeInTheDocument();
      expect(queryHint()).not.toBeInTheDocument();
      expect(getButton()).toHaveTextContent('Lock');
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

    it.each([
      ['LOCKING', makeLock(DoorLock.LOCKSTATE_LOCKING)],
      ['UNLOCKING', makeLock(DoorLock.LOCKSTATE_UNLOCKING)],
      ['jammed LOCKING', makeLock(DoorLock.LOCKSTATE_LOCKING, JAM)],
      ['jammed UNLOCKED', makeLock(DoorLock.LOCKSTATE_UNLOCKED, JAM)],
      ['unknown', makeLock('BOLT_OUT')],
    ])('sends LOCKED when clicked in the %s state', async (_name, device) => {
      mockDevice = device;
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_LOCKED);
      });
      expect(mockSetAttribute).toHaveBeenCalledTimes(1);
    });

    it('disables the button while the request is in flight and re-enables it afterwards', async () => {
      let resolve: (value: SetAttributesResponse) => void = () => {};
      mockSetAttribute.mockReturnValue(new Promise<SetAttributesResponse>((r) => { resolve = r; }));
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      expect(getButton()).toHaveTextContent('...');
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
  });

  describe('edge cases', () => {
    it('offers "Lock" when the lock state is unknown', () => {
      mockDevice = makeLock();
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Unknown');
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).toBeEnabled();
    });

    it('treats an inherited property name as an unknown state', () => {
      mockDevice = makeLock('constructor');
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Unknown');
      expect(getButton()).toHaveTextContent('Lock');
    });

    it('disables the control when the device is not in the store', () => {
      mockDevice = undefined;
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Unknown');
      expect(getButton()).toBeDisabled();
    });
  });
});
