import { Base, Place } from '@arcus/core';
import { getAddPlaceAccess, type AddPlaceAccessInput, type PlaceRole } from '@/lib/addPlaceAccess';
import type { PlaceData } from '@/store/entityTypes';

// ── Helpers ───────────────────────────────────────────────────────────

// The person owns place-1 (account acct-own) and is a guest at place-2
// (someone else's account, acct-other).
const owned: PlaceRole = { placeId: 'place-1', role: 'OWNER' };
const guest: PlaceRole = { placeId: 'place-2', role: 'FULL_ACCESS' };
// Added (or joined) after sign-in, so only in the fetched list
const addedSinceSignIn: PlaceRole = { placeId: 'place-3', role: 'OWNER' };

function placeRecord(placeId: string, accountId: string): PlaceData {
  return {
    [Base.ATTR_ADDRESS]: `SERV:place:${placeId}`,
    [Base.ATTR_ID]: placeId,
    [Place.ATTR_ACCOUNT]: accountId,
  };
}

const ownedRecord = placeRecord('place-1', 'acct-own');
const guestRecord = placeRecord('place-2', 'acct-other');

function access(overrides: Partial<AddPlaceAccessInput> = {}) {
  return getAddPlaceAccess({
    activePlaceId: 'place-1',
    activePlace: ownedRecord,
    sessionPlaces: [owned, guest],
    places: [owned, guest],
    ...overrides,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('getAddPlaceAccess – owned active place', () => {
  it("is enabled for the active place's account", () => {
    expect(access()).toEqual({ status: 'enabled', accountId: 'acct-own' });
  });

  it('stays enabled from the session places when the places list failed to load or is empty', () => {
    // The section passes [] in both cases
    expect(access({ places: [] })).toEqual({ status: 'enabled', accountId: 'acct-own' });
  });

  it('is enabled at an owned place added since sign-in, from the fetched list', () => {
    expect(access({
      activePlaceId: 'place-3',
      activePlace: placeRecord('place-3', 'acct-own'),
      places: [owned, guest, addedSinceSignIn],
    })).toEqual({ status: 'enabled', accountId: 'acct-own' });
  });

  it('prefers the session role over the fetched list', () => {
    expect(access({ places: [{ placeId: 'place-1', role: 'FULL_ACCESS' }] }))
      .toEqual({ status: 'enabled', accountId: 'acct-own' });
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

describe('getAddPlaceAccess – unknown role', () => {
  it('is hidden when the active place is in neither list', () => {
    expect(access({
      activePlaceId: 'place-3',
      activePlace: placeRecord('place-3', 'acct-own'),
    })).toEqual({ status: 'hidden' });
  });

  it('is hidden without an active place', () => {
    expect(access({ activePlaceId: null, activePlace: null })).toEqual({ status: 'hidden' });
  });
});

describe('getAddPlaceAccess – guest active place', () => {
  const atGuestPlace = { activePlaceId: 'place-2', activePlace: guestRecord };

  it('is disabled with the switch hint when the person owns a place', () => {
    expect(access(atGuestPlace)).toEqual({ status: 'disabled', hint: 'switch' });
  });

  it('never offers the guest place account', () => {
    expect(access(atGuestPlace)).not.toHaveProperty('accountId');
  });

  it('is disabled with the new-account hint when the person owns no place', () => {
    expect(access({ ...atGuestPlace, sessionPlaces: [guest], places: [guest] }))
      .toEqual({ status: 'disabled', hint: 'new-account' });
  });

  it('suggests a new account when the places list fails to load and the session has no owned place', () => {
    expect(access({ ...atGuestPlace, sessionPlaces: [guest], places: [] }))
      .toEqual({ status: 'disabled', hint: 'new-account' });
  });

  it('suggests switching to a guest who added a place of their own since sign-in', () => {
    expect(access({ ...atGuestPlace, sessionPlaces: [guest], places: [guest, addedSinceSignIn] }))
      .toEqual({ status: 'disabled', hint: 'switch' });
  });

  it('is disabled even before the active place record loads, since only the role matters', () => {
    expect(access({ ...atGuestPlace, activePlace: null })).toEqual({ status: 'disabled', hint: 'switch' });
  });
});
