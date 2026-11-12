/**
 * Whether the signed-in person can add a place right now, and to which account.
 *
 * account:AddPlace is only authorized while the session's active place is one
 * the person owns: the client bridge runs RoleAuthorizer, which checks the
 * actor's grant for the active place. A person owns at most one account. So
 * both the check and the destination come from the active place: its role,
 * and its place:account.
 */

import { Base, Place } from '@arcus/core';
import type { PlaceData } from '@/store/entityTypes';

const OWNER = 'OWNER';

/** A place and the person's role there, from SessionCreated or ListAvailablePlaces. */
export interface PlaceRole {
  placeId: string;
  role?: string;
}

export interface AddPlaceAccessInput {
  /** The session's active place id. */
  activePlaceId: string | null | undefined;
  /** The loaded active-place record; it can still be the previous place's during a switch. */
  activePlace: PlaceData | null | undefined;
  /** The places from SessionCreated, as of sign-in. */
  sessionPlaces: PlaceRole[];
  /** The fetched places list, which also has places added or joined since sign-in. */
  places: PlaceRole[];
}

export type AddPlaceAccess =
  /** The active place's role or record isn't known yet. */
  | { status: 'hidden' }
  /** The active place is owned: add the place to this account. */
  | { status: 'enabled'; accountId: string }
  /**
   * The active place is a guest place. 'switch': the person owns a place to
   * switch to first. 'new-account': they own none (they only joined other
   * people's places), so they need an account of their own.
   */
  | { status: 'disabled'; hint: 'switch' | 'new-account' };

export function getAddPlaceAccess({
  activePlaceId,
  activePlace,
  sessionPlaces,
  places,
}: AddPlaceAccessInput): AddPlaceAccess {
  const activeRole =
    sessionPlaces.find((p) => p.placeId === activePlaceId)?.role
    // A place added or joined since sign-in is only in the fetched list
    ?? places.find((p) => p.placeId === activePlaceId)?.role;
  if (activeRole === undefined) return { status: 'hidden' };

  if (activeRole === OWNER) {
    // Read the account only from the active place's own record: the platform
    // adds the new place to whichever account the request is sent to.
    const accountId = activePlace?.[Base.ATTR_ID] === activePlaceId
      ? activePlace?.[Place.ATTR_ACCOUNT]
      : undefined;
    return accountId ? { status: 'enabled', accountId } : { status: 'hidden' };
  }

  const ownsAPlace = [...sessionPlaces, ...places].some((p) => p.role === OWNER);
  return { status: 'disabled', hint: ownsAPlace ? 'switch' : 'new-account' };
}
