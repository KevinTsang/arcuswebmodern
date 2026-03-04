/**
 * Default place selection logic.
 *
 * Mirrors arcusweb's PlaceManager.getDefaultPlace():
 * 1. Check localStorage for a previously selected place
 * 2. Pick the place with role === 'OWNER'
 * 3. Fall back to the first place alphabetically
 */

export interface SessionPlace {
  placeId: string;
  placeName: string;
  accountId: string;
  role: string;
}

export function getDefaultPlaceId(
  places: SessionPlace[],
  personId: string,
): string | undefined {
  if (places.length === 0) return undefined;

  // 1. Preferred place from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`arcus:placeId`);
    if (stored && places.some((p) => p.placeId === stored)) {
      return stored;
    }
  }

  // 2. OWNER place
  const ownerPlace = places.find((p) => p.role === 'OWNER');
  if (ownerPlace) return ownerPlace.placeId;

  // 3. First alphabetically
  const sorted = [...places].sort((a, b) =>
    (a.placeName ?? '').localeCompare(b.placeName ?? ''),
  );
  return sorted[0]?.placeId;
}
