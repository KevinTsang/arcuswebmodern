'use client';

/**
 * usePlaceAccess — the name of a place and the signed-in person's role there,
 * for any place they can access (not just the active one).
 *
 * Reads the SessionCreated snapshot (`auth.person.places`), preferring the
 * active place's live name. Only a place missing from that snapshot (e.g. one
 * added after sign-in) is looked up with `sess:ListAvailablePlaces`.
 *
 * A failed lookup shows an error toast unless `notifyOnError` is false, for a
 * caller that reports (or quietly handles) its own failures.
 */

import { useEffect, useState } from 'react';
import { Place } from '@arcus/core';
import { SessionService } from '@arcus/core/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

export type PlaceAccessStatus = 'loading' | 'ready' | 'failed';

export interface PlaceAccess {
  /** `loading` until the role is known; `failed` if the lookup failed. */
  status: PlaceAccessStatus;
  /** The place's name, or '' if not known (yet). */
  name: string;
  /** The person's role at the place (e.g. OWNER), or '' if they have none. */
  role: string;
}

export interface UsePlaceAccessOptions {
  /** Show an error toast when the lookup fails. Defaults to true. */
  notifyOnError?: boolean;
}

interface LookedUpPlace {
  placeId: string;
  name: string;
  role: string;
  failed: boolean;
}

export function usePlaceAccess(
  placeId: string | null | undefined,
  { notifyOnError = true }: UsePlaceAccessOptions = {},
): PlaceAccess {
  const dispatch = useAppDispatch();
  const sessionPlace = useAppSelector((s) =>
    s.auth.person?.places?.find((p) => p.placeId === placeId),
  );
  const activeName = useAppSelector((s) =>
    s.place.placeId === placeId ? s.place.place?.[Place.ATTR_NAME] : undefined,
  );
  const inSession = !!sessionPlace;
  const [lookedUp, setLookedUp] = useState<LookedUpPlace | null>(null);

  useEffect(() => {
    if (!placeId || inSession) return;
    let cancelled = false;
    SessionService.ListAvailablePlaces()
      .then((res) => {
        if (cancelled) return;
        const match = res.places?.find((p) => p.placeId === placeId);
        setLookedUp({ placeId, name: match?.name ?? '', role: match?.role ?? '', failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        if (notifyOnError) {
          dispatch(addNotification({ type: 'error', message: 'Failed to load place details.' }));
        }
        setLookedUp({ placeId, name: '', role: '', failed: true });
      });
    return () => { cancelled = true; };
  }, [placeId, inSession, notifyOnError, dispatch]);

  if (sessionPlace) {
    return { status: 'ready', name: activeName || sessionPlace.placeName, role: sessionPlace.role };
  }
  // Ignore a lookup made for a previous placeId.
  const lookup = lookedUp?.placeId === placeId ? lookedUp : null;
  if (!lookup) return { status: 'loading', name: activeName ?? '', role: '' };
  if (lookup.failed) return { status: 'failed', name: activeName ?? '', role: '' };
  return { status: 'ready', name: activeName || lookup.name, role: lookup.role };
}
