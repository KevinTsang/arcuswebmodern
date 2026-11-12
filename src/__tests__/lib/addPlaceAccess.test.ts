import { Base, Place } from '@arcus/core';
import { getAddPlaceAccess, type AddPlaceAccessInput, type PlaceWithRole } from '@/lib/addPlaceAccess';
import type { PlaceAccess } from '@/hooks/usePlaceAccess';
import type { PlaceData } from '@/store/entityTypes';

// ── Helpers ───────────────────────────────────────────────────────────

// The person owns place-1 (account acct-own) and is a guest at place-2
// (someone else's account, acct-other).
const owned: PlaceWithRole = { placeId: 'place-1', role: 'OWNER' };
const guest: PlaceWithRole = { placeId: 'place-2', role: 'FULL_ACCESS' };

function placeRecord(placeId: string, accountId: string): PlaceData {
  return {
    [Base.ATTR_ADDRESS]: `SERV:place:${placeId}`,
    [Base.ATTR_ID]: placeId,
    [Place.ATTR_ACCOUNT]: accountId,
  };
}

const ownedRecord = placeRecord('place-1', 'acct-own');
const guestRecord = placeRecord('place-2', 'acct-other');

function ready(role: string): PlaceAccess {
  return { status: 'ready', name: '', role };
}

function access(overrides: Partial<AddPlaceAccessInput> = {}) {
  return getAddPlaceAccess({
    activePlaceId: 'place-1',
    activePlace: ownedRecord,
    activeAccess: ready('OWNER'),
    places: [owned, guest],
    ...overrides,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('getAddPlaceAccess – owned active place', () => {
  it("is enabled for the active place's account", () => {
    expect(access()).toEqual({ status: 'enabled', accountId: 'acct-own' });
  });

  it("is enabled whatever the places list holds, since the role comes from the active place's access", () => {
    expect(access({ places: [] })).toEqual({ status: 'enabled', accountId: 'acct-own' });
  });

  it.each([
    ['has not loaded', null],
    ['is still the previous place', guestRecord],
  ])("is hidden while the active place's record %s", (_, activePlace) => {
    expect(access({ activePlace })).toEqual({ status: 'hidden' });
  });

  it('is hidden when the record has no account', () => {
    expect(access({ activePlace: { [Base.ATTR_ID]: 'place-1' } })).toEqual({ status: 'hidden' });
  });
});

describe('getAddPlaceAccess – role not known', () => {
  it.each<[string, PlaceAccess]>([
    ['still loading', { status: 'loading', name: '', role: '' }],
    ['failed', { status: 'failed', name: '', role: '' }],
    ['not one of the person\'s places', ready('')],
  ])('is hidden while the active place access is %s', (_, activeAccess) => {
    expect(access({ activeAccess })).toEqual({ status: 'hidden' });
  });
});

describe('getAddPlaceAccess – guest active place', () => {
  const atGuestPlace = { activePlaceId: 'place-2', activePlace: guestRecord, activeAccess: ready('FULL_ACCESS') };

  it('is disabled with the switch hint when the person owns a place', () => {
    expect(access(atGuestPlace)).toEqual({ status: 'disabled', hint: 'switch' });
  });

  it('never offers the guest place account', () => {
    expect(access(atGuestPlace)).not.toHaveProperty('accountId');
  });

  it('is disabled with the new-account hint when the person owns no place', () => {
    expect(access({ ...atGuestPlace, places: [guest] })).toEqual({ status: 'disabled', hint: 'new-account' });
  });

  it('suggests switching to a guest who added a place of their own since sign-in', () => {
    const addedSinceSignIn: PlaceWithRole = { placeId: 'place-3', role: 'OWNER' };
    expect(access({ ...atGuestPlace, places: [guest, addedSinceSignIn] }))
      .toEqual({ status: 'disabled', hint: 'switch' });
  });

  it('is disabled even before the active place record loads, since only the role matters', () => {
    expect(access({ ...atGuestPlace, activePlace: null })).toEqual({ status: 'disabled', hint: 'switch' });
  });
});
