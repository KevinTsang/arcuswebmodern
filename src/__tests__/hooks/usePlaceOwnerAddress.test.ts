import { renderHook, waitFor } from '@testing-library/react';
import { Base, Place } from '@arcus/core';
import { usePlaceOwnerAddress } from '@/hooks/usePlaceOwnerAddress';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

let mockPlaceAddress: string | undefined;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: object) => unknown) =>
    sel({ place: { place: mockPlaceAddress ? { [Base.ATTR_ADDRESS]: mockPlaceAddress } : null } }),
}));

const PLACE = 'SERV:place:place-1';
const OWNER = 'SERV:person:owner';

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaceAddress = PLACE;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('usePlaceOwnerAddress', () => {
  it('returns the address of the person with the OWNER role', async () => {
    mockBridgeRequest.mockResolvedValue({
      persons: [
        { person: { [Base.ATTR_ADDRESS]: 'SERV:person:guest' }, role: 'FULL_ACCESS' },
        { person: { [Base.ATTR_ADDRESS]: OWNER }, role: 'OWNER' },
      ],
    });
    const { result } = renderHook(() => usePlaceOwnerAddress());

    await waitFor(() => expect(result.current).toBe(OWNER));
    expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_LISTPERSONSWITHACCESS, PLACE, {});
  });

  it('is undefined while loading', () => {
    mockBridgeRequest.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePlaceOwnerAddress());
    expect(result.current).toBeUndefined();
  });

  it('is undefined when no one is listed as owner', async () => {
    mockBridgeRequest.mockResolvedValue({ persons: [{ person: { [Base.ATTR_ADDRESS]: 'SERV:person:x' }, role: 'FULL_ACCESS' }] });
    const { result } = renderHook(() => usePlaceOwnerAddress());
    await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('is undefined when the lookup fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => usePlaceOwnerAddress());
    await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('does not ask the platform without an active place', () => {
    mockPlaceAddress = undefined;
    const { result } = renderHook(() => usePlaceOwnerAddress());
    expect(result.current).toBeUndefined();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});
