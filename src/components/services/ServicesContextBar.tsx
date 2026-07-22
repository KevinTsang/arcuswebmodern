'use client';

import { Place } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';

/**
 * Context bar for the Services area — the "Services" heading and the current
 * place name. Client component because the place name comes from the store,
 * which is hydrated at runtime.
 */
export function ServicesContextBar() {
  const placeName = useAppSelector(
    (s) => s.place.place?.[Place.ATTR_NAME] ?? 'Your Home',
  );

  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
        Services
      </h2>
      <span className="text-sm text-grouse">{placeName}</span>
    </div>
  );
}
