'use client';

/**
 * PlaceSelector — choose between available places.
 *
 * Ported from src/components/place-selector/place-selector.js.
 * Fetches available places via SessionService.ListAvailablePlaces(),
 * displays them as a radio list, and dispatches switchPlaceThunk.
 */

import { useState, useEffect, useCallback } from 'react';
import { SessionService } from '@arcus/core/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { switchPlaceThunk } from '@/store/thunks/switchPlaceThunk';
import { logoutThunk } from '@/store/thunks/logoutThunk';
import { useSidePanel } from '@/components/SidePanel';
import { formatRole } from '@/components/settings/settingsHelper';
import type { AvailablePlace } from '@/arcus/types';

export default function PlaceSelector() {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const currentPlaceId = useAppSelector((s) => s.place.placeId);
  const [places, setPlaces] = useState<AvailablePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    SessionService.ListAvailablePlaces()
      .then((res) => {
        const sorted = (res.places ?? []).sort(
          (a: AvailablePlace, b: AvailablePlace) =>
            (a.name ?? '').localeCompare(b.name ?? ''),
        );
        setPlaces(sorted);
        setLoading(false);
      })
      .catch(() => {
        setPlaces([]);
        setLoading(false);
      });
  }, []);

  const handleSelectPlace = useCallback(
    async (place: AvailablePlace) => {
      if (place.placeId === currentPlaceId) return;
      setSwitching(true);
      try {
        await dispatch(switchPlaceThunk(place.placeId)).unwrap();
        closeRight();
      } catch (e) {
        console.error('Failed to switch place:', e);
      }
      setSwitching(false);
    },
    [currentPlaceId, dispatch, closeRight],
  );

  const handleLogout = useCallback(() => {
    dispatch(logoutThunk());
  }, [dispatch]);

  return (
    <div>
      <h3 data-testid="place-selector-title" className="text-lg font-semibold text-swift mb-4">Choose a Place</h3>

      {loading ? (
        <p className="text-grouse">Loading places...</p>
      ) : places.length === 0 ? (
        <p className="text-grouse">No places available.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {places.map((place) => {
            const isCurrent = place.placeId === currentPlaceId;
            return (
              <li key={place.placeId}>
                <button
                  onClick={() => handleSelectPlace(place)}
                  data-testid={`place-option-${place.placeId}`}
                  data-current={isCurrent}
                  disabled={switching}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-[var(--border-radius-base)]
                    border transition-colors text-left
                    ${isCurrent
                      ? 'border-peacock bg-peacock/5 text-swift'
                      : 'border-heron hover:border-grouse text-coot'}
                    ${switching ? 'opacity-50' : ''}
                  `}
                >
                  <div
                    className={`
                      w-4 h-4 rounded-full border-2 flex-shrink-0
                      ${isCurrent ? 'border-peacock bg-peacock' : 'border-grouse'}
                    `}
                  />
                  <div>
                    <span className="block font-medium">{place.name ?? 'Unnamed Place'}</span>
                    {place.role && (
                      <span className="text-xs text-grouse">{formatRole(place.role)}</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <hr className="border-heron mb-4" />

      <button
        onClick={handleLogout}
        data-testid="logout"
        className="w-full text-center px-4 py-2.5 text-cardinal border border-cardinal rounded-[var(--border-radius-base)] hover:bg-cardinal/5 transition-colors"
      >
        Log Out
      </button>
    </div>
  );
}
