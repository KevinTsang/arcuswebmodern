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
import type { ListPersonsWithAccessResponse, PendingInvitationsResponse } from '@/arcus/types';
import { AddPlacePanel } from './AddPlacePanel';
import { AddPlaceControls } from './AddPlaceControls';
import { getAddPlaceAccess } from '@/lib/addPlaceAccess';
import { usePlaceAccess } from '@/hooks/usePlaceAccess';

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

  // The person's role at the active place. This section loads the places list
  // itself and shows "No places found." when that fails, so no second toast.
  const activeAccess = usePlaceAccess(activePlaceId, { notifyOnError: false });
  // Whether Add Place is enabled, and for which account: see getAddPlaceAccess.
  const addPlaceAccess = getAddPlaceAccess({
    activePlaceId,
    activePlace,
    activeAccess,
    places: [...(currentPerson?.places ?? []), ...places],
  });

  const handleAddPlace = useCallback((accountId: string) => {
    openRight(<AddPlacePanel accountId={accountId} onSaved={refresh} />, {
      title: 'Add a Place',
      key: 'add-place',
    });
  }, [openRight, refresh]);

  useEffect(() => {
    let cancelled = false;

    // Only the first load shows "Loading places…"; a refresh keeps the
    // current list on screen until the new one arrives.
    async function fetchAll() {
      try {
        const res = await SessionService.ListAvailablePlaces();
        const available = res.places ?? [];

        // Fetch full attributes, people (with their roles) and, for owned
        // places, pending invitations for each place in parallel
        const enriched = await Promise.all(
          available.map(async (ap): Promise<PlaceWithPeople> => {
            const placeAddress = `SERV:place:${ap.placeId}`;
            const [placeData, personsResult, invitesResult] = await Promise.all([
              Bridge.request<PlaceData>(Base.CMD_GETATTRIBUTES, placeAddress, {}).catch(() => null),
              Bridge.request<ListPersonsWithAccessResponse>(Place.CMD_LISTPERSONSWITHACCESS, placeAddress, {})
                .catch((): ListPersonsWithAccessResponse => ({ persons: [] })),
              ap.role === OWNER
                ? Bridge.request<PendingInvitationsResponse>(Place.CMD_PENDINGINVITATIONS, placeAddress, {})
                  .catch((): PendingInvitationsResponse => ({ invitations: [] }))
                : Promise.resolve<PendingInvitationsResponse>({ invitations: [] }),
            ]);
            return {
              placeId: ap.placeId,
              name: ap.name,
              role: ap.role,
              primary: ap.primary,
              placeData,
              people: (personsResult?.persons ?? []).filter((p) => p?.person),
              invitations: invitesResult?.invitations ?? [],
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

      <AddPlaceControls access={addPlaceAccess} onAdd={handleAddPlace} />
    </div>
  );
}
