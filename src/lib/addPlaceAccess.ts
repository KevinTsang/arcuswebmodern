/**
 * Whether the signed-in person can add a place right now, and to which account.
 *
 * account:AddPlace is only authorized while the session's active place is one
 * the person owns: the client bridge runs RoleAuthorizer, which checks the
 * actor's grant for the active place. A person owns at most one account. So
 * both the check and the destination come from the active place: its role
 * (from usePlaceAccess), and its place:account.
 */

import { Base, Place } from '@arcus/core';
import type { PlaceData } from '@/store/entityTypes';
import type { PlaceAccess } from '@/hooks/usePlaceAccess';

const OWNER = 'OWNER';

/** A place and the person's role there, from SessionCreated or ListAvailablePlaces. */
export interface PlaceWithRole {
  placeId: string;
  role?: string;
}

export interface AddPlaceAccessInput {
  /** The session's active place id. */
  activePlaceId: string | null | undefined;
  /** The loaded active-place record; it can still be the previous place's during a switch. */
  activePlace: PlaceData | null | undefined;
  /** usePlaceAccess for the active place: the person's role there. */
  activeAccess: PlaceAccess;
  /** Every place the person can access (SessionCreated and the fetched list), to tell whether they own one. */
  places: PlaceWithRole[];
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
  activeAccess,
  places,
}: AddPlaceAccessInput): AddPlaceAccess {
  // Still loading, failed, or not one of the person's places
  if (activeAccess.status !== 'ready' || !activeAccess.role) return { status: 'hidden' };

  if (activeAccess.role === OWNER) {
    // Read the account only from the active place's own record: the platform
    // adds the new place to whichever account the request is sent to.
    const accountId = activePlace?.[Base.ATTR_ID] === activePlaceId
      ? activePlace?.[Place.ATTR_ACCOUNT]
      : undefined;
    return accountId ? { status: 'enabled', accountId } : { status: 'hidden' };
  }

  const ownsAPlace = places.some((p) => p.role === OWNER);
  return { status: 'disabled', hint: ownsAPlace ? 'switch' : 'new-account' };
}
