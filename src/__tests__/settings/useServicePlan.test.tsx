import { renderHook } from '@testing-library/react';
import { Account, Base, Place } from '@arcus/core';
import { useServicePlan } from '@/components/settings/useServicePlan';
import type { AccountData, PlaceData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockPersonId: string | undefined;
let mockAccount: AccountData | null;
let mockPlace: PlaceData | null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      auth: { person: mockPersonId ? { personId: mockPersonId } : null, account: mockAccount },
      place: { place: mockPlace },
    }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

beforeEach(() => {
  mockPersonId = 'person-1';
  mockAccount = {
    [Base.ATTR_ADDRESS]: 'SERV:account:acct-1',
    [Account.ATTR_STATE]: 'COMPLETE',
    [Account.ATTR_OWNER]: 'person-1',
  };
  mockPlace = {
    [Base.ATTR_ADDRESS]: 'SERV:place:place-1',
    [Base.ATTR_ID]: 'place-1',
    [Place.ATTR_ACCOUNT]: 'acct-1',
    [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM,
    [Place.ATTR_SERVICEADDONS]: ['CELLBACKUP'],
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useServicePlan', () => {
  it('reports the plan and lets the account owner manage it', () => {
    const { result } = renderHook(() => useServicePlan());
    expect(result.current).toEqual({
      placeAddress: 'SERV:place:place-1',
      placeId: 'place-1',
      level: Place.SERVICELEVEL_PREMIUM,
      addons: ['CELLBACKUP'],
      accountAddress: 'SERV:account:acct-1',
      canManage: true,
    });
  });

  it('does not let someone other than the owner manage the plan', () => {
    mockAccount = { ...mockAccount!, [Account.ATTR_OWNER]: 'someone-else' };
    const { result } = renderHook(() => useServicePlan());
    expect(result.current.canManage).toBe(false);
  });

  it('ignores a loaded account that is not the place\'s account', () => {
    mockPlace = { ...mockPlace!, [Place.ATTR_ACCOUNT]: 'other-account' };
    const { result } = renderHook(() => useServicePlan());
    expect(result.current.accountAddress).toBeUndefined();
    expect(result.current.canManage).toBe(false);
  });

  it('cannot manage without a signed-in person', () => {
    mockPersonId = undefined;
    const { result } = renderHook(() => useServicePlan());
    expect(result.current.canManage).toBe(false);
  });

  it('handles a place that has not loaded', () => {
    mockPlace = null;
    const { result } = renderHook(() => useServicePlan());
    expect(result.current).toEqual({
      placeAddress: undefined,
      placeId: undefined,
      level: undefined,
      addons: [],
      accountAddress: undefined,
      canManage: false,
    });
  });

  it('defaults to no add-ons', () => {
    delete mockPlace![Place.ATTR_SERVICEADDONS];
    const { result } = renderHook(() => useServicePlan());
    expect(result.current.addons).toEqual([]);
  });
});
