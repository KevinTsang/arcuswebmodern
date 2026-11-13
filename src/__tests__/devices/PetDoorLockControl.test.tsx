import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PetDoor } from '@arcus/core';
import PetDoorLockControl from '@/components/devices/PetDoorLockControl';
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
  useDeviceActions: () => ({ setAttribute: mockSetAttribute, sendCommand: jest.fn() }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:petdoor';

function mode(state: string) {
  return screen.getByTestId(`petdoor-mode-${state.toLowerCase()}-${ADDRESS}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeDevice(ADDRESS, { [PetDoor.ATTR_LOCKSTATE]: PetDoor.LOCKSTATE_LOCKED });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PetDoorLockControl', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PetDoorLockControl address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows Lock, Unlock and Auto with the current mode pressed and disabled', () => {
      render(<PetDoorLockControl address={ADDRESS} />);
      expect(screen.getByRole('group', { name: 'Pet door mode' })).toBeInTheDocument();
      expect(mode(PetDoor.LOCKSTATE_LOCKED)).toHaveAttribute('aria-pressed', 'true');
      expect(mode(PetDoor.LOCKSTATE_LOCKED)).toBeDisabled();
      expect(mode(PetDoor.LOCKSTATE_UNLOCKED)).toHaveTextContent('Unlock');
      expect(mode(PetDoor.LOCKSTATE_UNLOCKED)).toBeEnabled();
      expect(mode(PetDoor.LOCKSTATE_AUTO)).toHaveTextContent('Auto');
      expect(mode(PetDoor.LOCKSTATE_AUTO)).toHaveAttribute('aria-pressed', 'false');
    });

    it('marks Auto as current in auto mode', () => {
      mockDevice = makeDevice(ADDRESS, { [PetDoor.ATTR_LOCKSTATE]: PetDoor.LOCKSTATE_AUTO });
      render(<PetDoorLockControl address={ADDRESS} />);
      expect(mode(PetDoor.LOCKSTATE_AUTO)).toHaveAttribute('aria-pressed', 'true');
      expect(mode(PetDoor.LOCKSTATE_LOCKED)).toBeEnabled();
    });
  });

  describe('interactions', () => {
    it('writes the chosen lock state', async () => {
      render(<PetDoorLockControl address={ADDRESS} />);
      fireEvent.click(mode(PetDoor.LOCKSTATE_AUTO));
      expect(mode(PetDoor.LOCKSTATE_AUTO)).toHaveTextContent('...');
      expect(mode(PetDoor.LOCKSTATE_UNLOCKED)).toBeDisabled();
      expect(mockSetAttribute).toHaveBeenCalledWith(PetDoor.ATTR_LOCKSTATE, PetDoor.LOCKSTATE_AUTO);
      await waitFor(() => expect(mode(PetDoor.LOCKSTATE_AUTO)).toHaveTextContent('Auto'));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('shows an error and re-enables the buttons when the write fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<PetDoorLockControl address={ADDRESS} />);
      fireEvent.click(mode(PetDoor.LOCKSTATE_UNLOCKED));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to set the pet door to Unlocked' },
      }));
      expect(mode(PetDoor.LOCKSTATE_UNLOCKED)).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('enables every mode when the lock state is unknown', () => {
      mockDevice = makeDevice(ADDRESS);
      render(<PetDoorLockControl address={ADDRESS} />);
      [PetDoor.LOCKSTATE_LOCKED, PetDoor.LOCKSTATE_UNLOCKED, PetDoor.LOCKSTATE_AUTO].forEach((s) => {
        expect(mode(s)).toBeEnabled();
      });
    });

    it('renders without a device', () => {
      mockDevice = undefined;
      render(<PetDoorLockControl address={ADDRESS} />);
      expect(mode(PetDoor.LOCKSTATE_LOCKED)).toBeEnabled();
    });
  });
});
