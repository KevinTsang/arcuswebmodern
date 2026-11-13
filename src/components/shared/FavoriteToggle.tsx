'use client';

import { useCallback, useState } from 'react';
import { Base } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { isFavorite, setFavorite } from '@/lib/favorites';
import type { ArcusEntity } from '@/store/entityTypes';

interface FavoriteToggleProps {
  /** The scene, rule or other platform object to favorite. */
  entity: ArcusEntity;
  /** Display name, used in the accessible label. */
  name: string;
  testId: string;
}

/**
 * Star button that adds or removes the `FAVORITE` tag on a platform object.
 * The new state arrives through the object's `base:ValueChange`, so the star
 * follows the store rather than local state.
 */
export function FavoriteToggle({ entity, name, testId }: FavoriteToggleProps) {
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);
  const favorite = isFavorite(entity);
  const address = entity[Base.ATTR_ADDRESS];

  const handleClick = useCallback(async () => {
    setSaving(true);
    try {
      await setFavorite(address, !favorite);
    } catch {
      dispatch(addNotification({
        type: 'error',
        message: favorite
          ? `Failed to remove ${name} from favorites`
          : `Failed to add ${name} to favorites`,
      }));
    } finally {
      setSaving(false);
    }
  }, [address, favorite, name, dispatch]);

  const label = favorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      data-testid={testId}
      data-favorite={favorite}
      aria-pressed={favorite}
      aria-label={label}
      title={favorite ? 'Remove from favorites' : 'Add to favorites'}
      className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
        favorite ? 'text-canary' : 'text-heron hover:text-grouse'
      }`}
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          fill={favorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.5}
        />
      </svg>
    </button>
  );
}
