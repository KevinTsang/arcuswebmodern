import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Halo } from '@arcus/core';
import HaloRoomConfigurator from '@/components/devices/HaloRoomConfigurator';
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

const ADDRESS = 'DRIV:dev:halo';
const ROOM_NAMES = {
  [Halo.ROOM_NONE]: 'None',
  [Halo.ROOM_LIVING_ROOM]: 'Living Room',
  [Halo.ROOM_BASEMENT]: 'Basement',
};

function select() {
  return screen.getByTestId('halo-room-select');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeDevice(ADDRESS, { [Halo.ATTR_ROOMNAMES]: ROOM_NAMES, [Halo.ATTR_ROOM]: Halo.ROOM_LIVING_ROOM });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HaloRoomConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HaloRoomConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('lists the device room names with the current room selected', () => {
      render(<HaloRoomConfigurator address={ADDRESS} />);
      expect(screen.getByLabelText('Room')).toBe(select());
      expect(select()).toHaveValue(Halo.ROOM_LIVING_ROOM);
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['None', 'Living Room', 'Basement']);
    });
  });

  describe('interactions', () => {
    it('saves the chosen room', async () => {
      render(<HaloRoomConfigurator address={ADDRESS} />);
      fireEvent.change(select(), { target: { value: Halo.ROOM_BASEMENT } });
      expect(mockSetAttribute).toHaveBeenCalledWith(Halo.ATTR_ROOM, Halo.ROOM_BASEMENT);
      expect(select()).toBeDisabled();
      await waitFor(() => expect(select()).toBeEnabled());
    });

    it('shows an error when saving fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<HaloRoomConfigurator address={ADDRESS} />);
      fireEvent.change(select(), { target: { value: Halo.ROOM_BASEMENT } });
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to save the room' },
      }));
      expect(select()).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('shows a placeholder when the room is not one of the names', () => {
      mockDevice = makeDevice(ADDRESS, { [Halo.ATTR_ROOMNAMES]: ROOM_NAMES });
      render(<HaloRoomConfigurator address={ADDRESS} />);
      expect(screen.getByRole('option', { name: 'Select a room' })).toBeDisabled();
    });

    it('explains when the device has no room names', () => {
      mockDevice = makeDevice(ADDRESS);
      render(<HaloRoomConfigurator address={ADDRESS} />);
      expect(screen.getByTestId('halo-room-empty')).toBeInTheDocument();
      expect(screen.queryByTestId('halo-room-select')).not.toBeInTheDocument();
    });
  });
});
