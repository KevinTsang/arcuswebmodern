import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoorLock } from '@arcus/core';
import LockUnlock from '@/components/devices/LockUnlock';

const mockSetAttribute = jest.fn().mockResolvedValue(undefined);
let mockDevice: Record<string, unknown> = {};

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    sendCommand: jest.fn(),
  }),
}));

beforeEach(() => {
  mockSetAttribute.mockClear();
});

describe('LockUnlock', () => {
  it('renders "Unlock" when locked', () => {
    mockDevice = { [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_LOCKED };
    render(<LockUnlock address="DRIV:dev:test" />);
    expect(screen.getByText('Unlock')).toBeInTheDocument();
  });

  it('renders "Lock" when unlocked', () => {
    mockDevice = { [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_UNLOCKED };
    render(<LockUnlock address="DRIV:dev:test" />);
    expect(screen.getByText('Lock')).toBeInTheDocument();
  });

  it('sends UNLOCKED when toggling a locked device', async () => {
    mockDevice = { [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_LOCKED };
    render(<LockUnlock address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Unlock'));
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_UNLOCKED);
    });
  });

  it('sends LOCKED when toggling an unlocked device', async () => {
    mockDevice = { [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_UNLOCKED };
    render(<LockUnlock address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Lock'));
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_LOCKED);
    });
  });

  it('shows pending state while toggling', async () => {
    mockSetAttribute.mockReturnValue(new Promise(() => {})); // never resolves
    mockDevice = { [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_LOCKED };
    render(<LockUnlock address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Unlock'));
    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });
});
