'use client';

/**
 * People & Places section — shows ALL places the user has access to,
 * separated into "Your Places" (owner) and "Guest At" groups.
 *
 * People are displayed as a subsection inside each place card.
 *
 * Mirrors the structure from arcusweb:
 *   src/components/settings/places/places.stache
 *   src/components/settings/places/place/place.stache
 */

import { useState, useEffect, useCallback } from 'react';
import { SessionService } from '@arcus/core/services';
import Bridge from '@arcus/core/bridge';
import { Base, Place } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { useSidePanel } from '@/components/SidePanel';
import PlaceCard from './PlaceCard';
import { type PlaceWithPeople, type PlaceData } from './types';
import type { ListPersonsResponse } from '@/arcus/types';
import { AddPlacePanel } from './AddPlacePanel';

const OWNER = 'OWNER';

export default function PeoplePlacesSection() {
  const { openRight } = useSidePanel();
  const activePlaceId = useAppSelector((s) => s.place.placeId);
  const activePlace = useAppSelector((s) => s.place.place);
  const currentPerson = useAppSelector((s) => s.auth.person);

  const [places, setPlaces] = useState<PlaceWithPeople[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // account:AddPlace is only authorized while the session's active place is
  // one the person owns (RoleAuthorizer checks the active place), and a person
  // owns at most one account. So both the check and the destination come from
  // the active place: its role, and its place:account.
  const sessionPlaces = currentPerson?.places ?? [];
  const activeRole =
    sessionPlaces.find((p) => p.placeId === activePlaceId)?.role
    // A place added or joined since sign-in is only in the fetched list
    ?? places.find((p) => p.placeId === activePlaceId)?.role;
  // Read the account only from the active place's own record: the platform
  // adds the new place to whichever account the request is sent to.
  const activeAccountId = activePlace?.[Base.ATTR_ID] === activePlaceId
    ? activePlace?.[Place.ATTR_ACCOUNT]
    : undefined;
  const addPlaceAccountId = activeRole === OWNER ? activeAccountId : undefined;
  // Only point guests at a place of their own when they have one to switch to.
  const ownsAPlace = [...sessionPlaces, ...places].some((p) => p.role === OWNER);
  const atGuestPlace = activeRole !== undefined && activeRole !== OWNER && ownsAPlace;

  const handleAddPlace = useCallback(() => {
    if (!addPlaceAccountId) return;
    openRight(<AddPlacePanel accountId={addPlaceAccountId} onSaved={refresh} />);
  }, [addPlaceAccountId, openRight, refresh]);

  useEffect(() => {
    let cancelled = false;

    // Only the first load shows "Loading places…"; a refresh keeps the
    // current list on screen until the new one arrives.
    async function fetchAll() {
      try {
        const res = await SessionService.ListAvailablePlaces();
        const available = res.places ?? [];

        // Fetch full attributes + people for each place in parallel
        const enriched = await Promise.all(
          available.map(async (ap) => {
            const placeAddress = `SERV:place:${ap.placeId}`;
            const [placeData, personsResult] = await Promise.all([
              Bridge.request<PlaceData>(Base.CMD_GETATTRIBUTES, placeAddress, {}).catch(() => null),
              Bridge.request<ListPersonsResponse>(Place.CMD_LISTPERSONS, placeAddress, {}).catch(() => ({ persons: [] })),
            ]);
            return {
              placeId: ap.placeId,
              name: ap.name,
              role: ap.role,
              placeData,
              people: personsResult.persons ?? [],
            };
          }),
        );

        if (!cancelled) {
          // Sort: owner places first, then alphabetical
          enriched.sort((a, b) => a.name.localeCompare(b.name));
          setPlaces(enriched);
        }
      } catch {
        if (!cancelled) setPlaces([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) {
    return <p className="text-grouse">Loading places…</p>;
  }

  const ownerPlaces = places.filter((p) => p.role === OWNER);
  const guestPlaces = places.filter((p) => p.role !== OWNER);

  return (
    <div className="space-y-8">
      {/* Owner places */}
      {ownerPlaces.length > 0 && (
        <div data-testid="owner-places" className="space-y-4">
          <h3 className="text-sm font-medium text-grouse uppercase tracking-wide">Your Places</h3>
          {ownerPlaces.map((place) => (
            <PlaceCard
              key={place.placeId}
              place={place}
              isOwner
              isActive={place.placeId === activePlaceId}
              currentPersonId={currentPerson?.personId as string | undefined}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {/* Guest places */}
      {guestPlaces.length > 0 && (
        <div data-testid="guest-places" className="space-y-4">
          <h3 className="text-sm font-medium text-grouse uppercase tracking-wide">Guest At</h3>
          {guestPlaces.map((place) => (
            <PlaceCard
              key={place.placeId}
              place={place}
              isOwner={false}
              isActive={place.placeId === activePlaceId}
              currentPersonId={currentPerson?.personId as string | undefined}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {places.length === 0 && (
        <p className="text-sm text-grouse">No places found.</p>
      )}

      {/* Add place — only while the active place is one the person owns */}
      {(addPlaceAccountId || atGuestPlace) && (
        <div data-testid="add-place-section" className="space-y-2">
          <button
            onClick={handleAddPlace}
            data-testid="add-place"
            disabled={!addPlaceAccountId}
            className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
          >
            + Add Place
          </button>
          {atGuestPlace && (
            <p data-testid="add-place-hint" className="text-xs text-grouse">
              To add a place, first switch to a place you own.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
