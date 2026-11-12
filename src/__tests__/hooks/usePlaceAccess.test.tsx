import { renderHook, waitFor } from '@testing-library/react';
import { Base, Place } from '@arcus/core';
import { usePlaceAccess } from '@/hooks/usePlaceAccess';
import type { SessionPlace } from '@/arcus/types';
import type { PlaceData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockListAvailablePlaces = jest.fn();

let mockActivePlaceId: string | null = 'place-1';
let mockActivePlace: PlaceData | null = null;
let mockSessionPlaces: SessionPlace[] = [];

jest.mock('@arcus/core/services', () => ({
  SessionService: { ListAvailablePlaces: (...args: unknown[]) => mockListAvailablePlaces(...args) },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: unknown) => unknown) =>
    sel({
      place: { placeId: mockActivePlaceId, place: mockActivePlace },
      auth: { person: { places: mockSessionPlaces } },
    }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const homeSession: SessionPlace = { placeId: 'place-1', placeName: 'Home', accountId: 'acct-own', role: 'OWNER' };

const LOOKUP_ERROR = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Failed to load place details.' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockActivePlaceId = 'place-1';
  mockActivePlace = null;
  mockSessionPlaces = [homeSession];
  mockListAvailablePlaces.mockResolvedValue({
    places: [{ placeId: 'place-3', name: 'Cabin', role: 'OWNER' }],
  });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('usePlaceAccess – places from the session', () => {
  it('is ready with the session role and name, without a lookup', () => {
    const { result } = renderHook(() => usePlaceAccess('place-1'));
    expect(result.current).toEqual({ status: 'ready', name: 'Home', role: 'OWNER' });
    expect(mockListAvailablePlaces).not.toHaveBeenCalled();
  });

  it("prefers the active place's live name", () => {
    mockActivePlace = { [Base.ATTR_ID]: 'place-1', [Place.ATTR_NAME]: 'Renamed Home' };
    const { result } = renderHook(() => usePlaceAccess('place-1'));
    expect(result.current.name).toBe('Renamed Home');
  });
});

describe('usePlaceAccess – places added since sign-in', () => {
  it('looks the place up and is ready with its role', async () => {
    const { result } = renderHook(() => usePlaceAccess('place-3'));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current).toEqual({ status: 'ready', name: 'Cabin', role: 'OWNER' }));
    expect(mockListAvailablePlaces).toHaveBeenCalledTimes(1);
  });

  it('is ready with no role for a place the person cannot access', async () => {
    const { result } = renderHook(() => usePlaceAccess('place-9'));
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', name: '', role: '' }));
  });

  it('is loading without a place id, and looks nothing up', () => {
    const { result } = renderHook(() => usePlaceAccess(null));
    expect(result.current.status).toBe('loading');
    expect(mockListAvailablePlaces).not.toHaveBeenCalled();
  });
});

describe('usePlaceAccess – a failed lookup', () => {
  it('fails and shows an error toast by default', async () => {
    mockListAvailablePlaces.mockRejectedValueOnce(new Error('timeout'));
    const { result } = renderHook(() => usePlaceAccess('place-3'));

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.role).toBe('');
    expect(mockDispatch).toHaveBeenCalledWith(LOOKUP_ERROR);
  });

  it('fails without a toast when notifyOnError is false', async () => {
    mockListAvailablePlaces.mockRejectedValueOnce(new Error('timeout'));
    const { result } = renderHook(() => usePlaceAccess('place-3', { notifyOnError: false }));

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
