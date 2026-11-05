import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Device, DeviceAdvanced } from '@arcus/core';
import { DevicePanel } from '@/components/devices/DevicePanel';
import type { DeviceEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:d1';
let mockDevice: DeviceEntity;
const mockDispatch = jest.fn();
const mockSetFavorite = jest.fn();
const mockSetAttribute = jest.fn();

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({ setAttribute: mockSetAttribute }),
}));

jest.mock('@/hooks/useDeviceConfig', () => ({
  useDeviceConfig: () => ({}),
  useDeviceStatus: () => 'On',
  isDeviceOffline: () => false,
  isDeviceOn: () => false,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: jest.fn() }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// Real isFavorite (reads base:tags), spy on setFavorite.
jest.mock('@/lib/favorites', () => ({
  FAVORITE_TAG: 'FAVORITE',
  isFavorite: (e: Record<string, unknown>) =>
    Array.isArray(e['base:tags']) && (e['base:tags'] as string[]).includes('FAVORITE'),
  setFavorite: (...args: unknown[]) => mockSetFavorite(...args),
}));

// Child components render deep trees — stub them out.
jest.mock('@/components/devices/DeviceIcon', () => ({ DeviceIcon: () => <div>icon</div> }));
jest.mock('@/components/devices/DeviceActions', () => ({ DeviceActions: () => <div>actions</div> }));
jest.mock('@/components/devices/DeviceBadges', () => ({ DeviceBadges: () => <div>badges</div> }));
jest.mock('@/components/devices/DeviceConfigurationPanel', () => ({ DeviceConfigurationPanel: () => <div>config</div> }));
jest.mock('@/components/devices/DeviceDetailPanel', () => ({ DeviceDetailPanel: () => <div>detail</div> }));

function device(tags?: string[]): DeviceEntity {
  return {
    id: ADDRESS,
    [Base.ATTR_ADDRESS]: ADDRESS,
    [Device.ATTR_NAME]: 'Lamp',
    ...(tags ? { [Base.ATTR_TAGS]: tags } : {}),
  } as DeviceEntity;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetFavorite.mockResolvedValue({});
  mockDevice = device();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DevicePanel – favorite toggle', () => {
  it('shows an inactive star when the device is not tagged FAVORITE', () => {
    render(<DevicePanel address={ADDRESS} />);
    expect(screen.getByTitle('Add to favorites')).toBeInTheDocument();
  });

  it('shows an active star when the device is tagged FAVORITE', () => {
    mockDevice = device(['FAVORITE']);
    render(<DevicePanel address={ADDRESS} />);
    expect(screen.getByTitle('Remove from favorites')).toBeInTheDocument();
  });

  it('favorites the device via setFavorite(address, true) when not yet a favorite', async () => {
    render(<DevicePanel address={ADDRESS} />);
    fireEvent.click(screen.getByTitle('Add to favorites'));
    await waitFor(() => expect(mockSetFavorite).toHaveBeenCalledWith(ADDRESS, true));
  });

  it('unfavorites the device via setFavorite(address, false) when already a favorite', async () => {
    mockDevice = device(['FAVORITE']);
    render(<DevicePanel address={ADDRESS} />);
    fireEvent.click(screen.getByTitle('Remove from favorites'));
    await waitFor(() => expect(mockSetFavorite).toHaveBeenCalledWith(ADDRESS, false));
  });

  it('dispatches an error notification when the toggle fails', async () => {
    mockSetFavorite.mockRejectedValueOnce(new Error('boom'));
    render(<DevicePanel address={ADDRESS} />);
    fireEvent.click(screen.getByTitle('Add to favorites'));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to update favorite' },
        }),
      ),
    );
  });
});

describe('DevicePanel – error indicator', () => {
  it('hides the indicator when devadv:errors is absent', () => {
    render(<DevicePanel address={ADDRESS} />);
    expect(screen.queryByTitle('Device has errors')).not.toBeInTheDocument();
  });

  it('hides the indicator when devadv:errors is an empty map', () => {
    mockDevice = { ...device(), [DeviceAdvanced.ATTR_ERRORS]: {} };
    render(<DevicePanel address={ADDRESS} />);
    expect(screen.queryByTitle('Device has errors')).not.toBeInTheDocument();
  });

  it('shows the indicator when devadv:errors has entries', () => {
    mockDevice = { ...device(), [DeviceAdvanced.ATTR_ERRORS]: { ERR_JAM: 'Lock is jammed' } };
    render(<DevicePanel address={ADDRESS} />);
    expect(screen.getByTitle('Device has errors')).toBeInTheDocument();
  });
});
