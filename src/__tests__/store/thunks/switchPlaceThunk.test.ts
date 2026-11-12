/**
 * Tests for switchPlaceThunk — switching the active place.
 */

import { Base, Account } from '@arcus/core';
import { accountUpdated } from '@/store/slices/authSlice';
import type { RootState } from '@/store/store';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetActivePlace = jest.fn();
jest.mock('@arcus/core/services', () => ({
  SessionService: { SetActivePlace: (...args: any[]) => mockSetActivePlace(...args) },
}));

const mockBridgeRequest = jest.fn();
jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

const mockLoadUnwrap = jest.fn();
jest.mock('@/store/thunks/loadPlaceDataThunk', () => ({
  loadPlaceDataThunk: (placeId: string) => ({ type: 'place/loadData', payload: placeId }),
}));

const dispatched: any[] = [];
const dispatch = Object.assign(
  (action: any) => {
    dispatched.push(action);
    return { ...action, unwrap: () => mockLoadUnwrap() };
  },
  { getState: () => ({}), extra: undefined, requestId: 'test', signal: new AbortController().signal, abort: jest.fn(), condition: jest.fn() },
);

// ── Helpers ───────────────────────────────────────────────────────────

const PLACES = [
  { placeId: 'place-home', placeName: 'Home', accountId: 'acc-1', role: 'OWNER' },
  { placeId: 'place-cabin', placeName: 'Cabin', accountId: 'acc-1', role: 'OWNER' },
  { placeId: 'place-guest', placeName: 'Friend', accountId: 'acc-2', role: 'FULL_ACCESS' },
];

const currentAccount = { [Base.ATTR_ADDRESS]: 'SERV:account:acc-1', [Account.ATTR_STATE]: 'COMPLETE', [Account.ATTR_OWNER]: 'p1' };
const guestAccount = { [Base.ATTR_ADDRESS]: 'SERV:account:acc-2', [Account.ATTR_STATE]: 'COMPLETE', [Account.ATTR_OWNER]: 'p2' };

function getState(): RootState {
  return { auth: { person: { personId: 'p1', places: PLACES }, account: currentAccount } } as unknown as RootState;
}

let switchPlaceThunk: typeof import('@/store/thunks/switchPlaceThunk').switchPlaceThunk;

beforeAll(async () => {
  switchPlaceThunk = (await import('@/store/thunks/switchPlaceThunk')).switchPlaceThunk;
});

beforeEach(() => {
  jest.clearAllMocks();
  dispatched.length = 0;
  localStorage.clear();
  mockSetActivePlace.mockResolvedValue({});
  mockBridgeRequest.mockResolvedValue(guestAccount);
  mockLoadUnwrap.mockResolvedValue('loaded');
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('switchPlaceThunk', () => {
  it('sets the active place and loads its data', async () => {
    const result = await switchPlaceThunk('place-cabin')(dispatch, getState, undefined);

    expect(mockSetActivePlace).toHaveBeenCalledWith('place-cabin');
    expect(dispatched).toContainEqual({ type: 'place/loadData', payload: 'place-cabin' });
    expect(result.payload).toBe('place-cabin');
  });

  it('persists the place so a reload restores it', async () => {
    localStorage.setItem('arcus:placeId', 'place-home');

    await switchPlaceThunk('place-cabin')(dispatch, getState, undefined);

    expect(localStorage.getItem('arcus:placeId')).toBe('place-cabin');
  });

  it('does not persist the place when SetActivePlace fails', async () => {
    localStorage.setItem('arcus:placeId', 'place-home');
    mockSetActivePlace.mockRejectedValueOnce(new Error('denied'));

    const result = await switchPlaceThunk('place-cabin')(dispatch, getState, undefined);

    expect(result.type).toBe('place/switchPlace/rejected');
    expect(localStorage.getItem('arcus:placeId')).toBe('place-home');
  });

  it('refreshes the account when the new place belongs to a different account', async () => {
    await switchPlaceThunk('place-guest')(dispatch, getState, undefined);

    expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, 'SERV:account:acc-2', {});
    expect(dispatched).toContainEqual(accountUpdated(guestAccount));
  });

  it('skips the account fetch when the new place shares the current account', async () => {
    await switchPlaceThunk('place-cabin')(dispatch, getState, undefined);

    expect(mockBridgeRequest).not.toHaveBeenCalled();
    expect(dispatched.some((a) => a.type === accountUpdated.type)).toBe(false);
  });

  it('keeps the switch and the previous account when the account fetch fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockBridgeRequest.mockRejectedValueOnce(new Error('timeout'));

    const result = await switchPlaceThunk('place-guest')(dispatch, getState, undefined);

    expect(result.type).toBe('place/switchPlace/fulfilled');
    expect(localStorage.getItem('arcus:placeId')).toBe('place-guest');
    expect(dispatched.some((a) => a.type === accountUpdated.type)).toBe(false);
    expect(consoleError).toHaveBeenCalledWith('Failed to load account for place:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('rejects when loading the place data fails', async () => {
    mockLoadUnwrap.mockRejectedValueOnce(new Error('load failed'));

    const result = await switchPlaceThunk('place-guest')(dispatch, getState, undefined);

    expect(result.type).toBe('place/switchPlace/rejected');
  });
});
