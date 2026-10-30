import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceAdvanced, DoorLock } from '@arcus/core';
import LockUnlock from '@/components/devices/LockUnlock';
import { WARN_JAM, type LockTarget } from '@/lib/lockStatus';
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

/** Every lockstate a jammed lock can report: the four platform values, missing and unrecognised. */
const JAMMED_STATES: [string, string | undefined][] = [
  ['LOCKED', DoorLock.LOCKSTATE_LOCKED],
  ['UNLOCKED', DoorLock.LOCKSTATE_UNLOCKED],
  ['LOCKING', DoorLock.LOCKSTATE_LOCKING],
  ['UNLOCKING', DoorLock.LOCKSTATE_UNLOCKING],
  ['missing', undefined],
  ['unrecognised', 'BOLT_OUT'],
];

/** Jammed-lock buttons: [name, test id, lockstate it writes, toast verb]. */
const JAMMED_BUTTONS: [string, string, LockTarget, string][] = [
  ['Lock', `device-lock-lock-${ADDRESS}`, DoorLock.LOCKSTATE_LOCKED, 'lock'],
  ['Unlock', `device-lock-unlock-${ADDRESS}`, DoorLock.LOCKSTATE_UNLOCKED, 'unlock'],
];

function makeLock(lockState?: string, errors?: Record<string, string>): DeviceEntity {
  return makeDevice(ADDRESS, {
    ...(lockState !== undefined && { [DoorLock.ATTR_LOCKSTATE]: lockState }),
    ...(errors && { [DeviceAdvanced.ATTR_ERRORS]: errors }),
  });
}

function getButton() {
  return screen.getByTestId(`device-lock-toggle-${ADDRESS}`);
}

function queryButton() {
  return screen.queryByTestId(`device-lock-toggle-${ADDRESS}`);
}

function getLockButton() {
  return screen.getByTestId(`device-lock-lock-${ADDRESS}`);
}

function getUnlockButton() {
  return screen.getByTestId(`device-lock-unlock-${ADDRESS}`);
}

function queryJammedButtons() {
  return [
    screen.queryByTestId(`device-lock-lock-${ADDRESS}`),
    screen.queryByTestId(`device-lock-unlock-${ADDRESS}`),
  ];
}

function queryStateText() {
  return screen.queryByTestId(`device-lock-state-${ADDRESS}`);
}

function queryHint() {
  return screen.queryByTestId(`device-lock-hint-${ADDRESS}`);
}

/** setAttribute returns a promise the test resolves by calling the returned function. */
function holdRequest(): () => void {
  let resolve: (value: SetAttributesResponse) => void = () => {};
  mockSetAttribute.mockReturnValue(new Promise<SetAttributesResponse>((r) => { resolve = r; }));
  return () => resolve({});
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
      expect(queryJammedButtons()).toEqual([null, null]);
    });

    it('offers "Lock" when unlocked', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED);
      render(<LockUnlock address={ADDRESS} />);
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).toBeEnabled();
      expect(queryStateText()).not.toBeInTheDocument();
      expect(queryJammedButtons()).toEqual([null, null]);
    });

    it('shows "Locking" and offers "Lock" again, never "Unlock", while locking', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING);
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Locking');
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).not.toHaveTextContent('Unlock');
      expect(getButton()).toBeEnabled();
      expect(queryJammedButtons()).toEqual([null, null]);
    });

    it('shows "Unlocking" and keeps "Lock" available while unlocking', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKING);
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Unlocking');
      expect(getButton()).toHaveTextContent('Lock');
      expect(getButton()).toBeEnabled();
      expect(queryJammedButtons()).toEqual([null, null]);
    });

    it.each(JAMMED_STATES)('shows "Jammed" with both Lock and Unlock enabled when a jammed lock reports %s', (_name, state) => {
      mockDevice = makeLock(state, JAM);
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Jammed');
      expect(queryHint()).toBeVisible();
      expect(queryHint()).toHaveTextContent('may be jammed');
      expect(queryButton()).not.toBeInTheDocument();

      expect(getLockButton()).toBe(screen.getByRole('button', { name: 'Lock' }));
      expect(getUnlockButton()).toBe(screen.getByRole('button', { name: 'Unlock' }));
      for (const button of [getLockButton(), getUnlockButton()]) {
        expect(button).toBeEnabled();
        expect(button).toHaveAccessibleDescription(/may be jammed/);
      }
      expect(getLockButton()).toHaveTextContent(/^Lock$/);
      expect(getUnlockButton()).toHaveTextContent(/^Unlock$/);
    });

    it('detects WARN_JAM by key, even with an empty message', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED, { [WARN_JAM]: '' });
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).toHaveTextContent('Jammed');
      expect(queryHint()).toBeInTheDocument();
      expect(getLockButton()).toBeEnabled();
      expect(getUnlockButton()).toBeEnabled();
    });

    it('ignores unrelated device errors', () => {
      mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED, { WARN_BATTERY: 'Low battery' });
      render(<LockUnlock address={ADDRESS} />);
      expect(queryStateText()).not.toBeInTheDocument();
      expect(queryHint()).not.toBeInTheDocument();
      expect(queryJammedButtons()).toEqual([null, null]);
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
      ['LOCKING', DoorLock.LOCKSTATE_LOCKING],
      ['UNLOCKING', DoorLock.LOCKSTATE_UNLOCKING],
      ['unknown', 'BOLT_OUT'],
    ])('sends LOCKED when clicked in the %s state', async (_name, state) => {
      mockDevice = makeLock(state);
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      await waitFor(() => {
        expect(mockSetAttribute).toHaveBeenCalledWith(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_LOCKED);
      });
      expect(mockSetAttribute).toHaveBeenCalledTimes(1);
    });

    it('disables the button while the request is in flight and re-enables it afterwards', async () => {
      const resolve = holdRequest();
      render(<LockUnlock address={ADDRESS} />);
      fireEvent.click(getButton());
      expect(getButton()).toHaveTextContent('...');
      expect(getButton()).toBeDisabled();

      resolve();
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

    describe('when jammed', () => {
      describe.each(JAMMED_STATES)('and the lock reports %s', (_name, state) => {
        it.each(JAMMED_BUTTONS)('"%s" sends its lockstate once', async (_label, testId, value) => {
          mockDevice = makeLock(state, JAM);
          render(<LockUnlock address={ADDRESS} />);
          fireEvent.click(screen.getByTestId(testId));
          await waitFor(() => {
            expect(mockSetAttribute).toHaveBeenCalledWith(DoorLock.ATTR_LOCKSTATE, value);
          });
          expect(mockSetAttribute).toHaveBeenCalledTimes(1);
        });
      });

      it.each(JAMMED_BUTTONS)('disables both buttons while "%s" is in flight and re-enables them afterwards', async (label, testId) => {
        mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING, JAM);
        const resolve = holdRequest();
        render(<LockUnlock address={ADDRESS} />);
        fireEvent.click(screen.getByTestId(testId));

        expect(screen.getByTestId(testId)).toHaveTextContent('...');
        expect(getLockButton()).toBeDisabled();
        expect(getUnlockButton()).toBeDisabled();
        // Names stay readable while the pressed button shows the in-flight marker.
        expect(screen.getByRole('button', { name: label })).toBe(screen.getByTestId(testId));

        // A second press, of either button, sends nothing while the first is in flight.
        fireEvent.click(getLockButton());
        fireEvent.click(getUnlockButton());
        expect(mockSetAttribute).toHaveBeenCalledTimes(1);

        resolve();
        await waitFor(() => {
          expect(getLockButton()).toBeEnabled();
        });
        expect(getUnlockButton()).toBeEnabled();
        expect(getLockButton()).toHaveTextContent(/^Lock$/);
        expect(getUnlockButton()).toHaveTextContent(/^Unlock$/);
        expect(mockDispatch).not.toHaveBeenCalled();
      });

      it.each(JAMMED_BUTTONS)('shows an error toast when "%s" fails and re-enables both buttons', async (_label, testId, _value, verb) => {
        mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKING, JAM);
        mockSetAttribute.mockRejectedValue(new Error('timeout'));
        render(<LockUnlock address={ADDRESS} />);
        fireEvent.click(screen.getByTestId(testId));
        await waitFor(() => {
          expect(mockDispatch).toHaveBeenCalledWith({
            type: 'ui/addNotification',
            payload: { type: 'error', message: `Failed to ${verb} the door` },
          });
        });
        expect(getLockButton()).toBeEnabled();
        expect(getUnlockButton()).toBeEnabled();
      });

      it('keeps the control disabled when the jam clears during a request', async () => {
        mockDevice = makeLock(DoorLock.LOCKSTATE_UNLOCKED, JAM);
        const resolve = holdRequest();
        const { rerender } = render(<LockUnlock address={ADDRESS} />);
        fireEvent.click(getLockButton());

        mockDevice = makeLock(DoorLock.LOCKSTATE_LOCKED);
        rerender(<LockUnlock address={ADDRESS} />);
        expect(queryJammedButtons()).toEqual([null, null]);
        expect(getButton()).toBeDisabled();

        resolve();
        await waitFor(() => {
          expect(getButton()).toBeEnabled();
        });
        expect(getButton()).toHaveTextContent('Unlock');
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
      expect(queryJammedButtons()).toEqual([null, null]);
    });
  });
});
