'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { switchPlaceThunk } from '@/store/thunks/switchPlaceThunk';
import { useSidePanel } from '@/components/SidePanel';

interface PlaceAddedViewProps {
  /** The new place's id; missing if the platform's reply didn't include the place. */
  placeId?: string;
  /** The new place's name. */
  name: string;
}

/**
 * Shown in the Add Place panel once the place exists: confirms it was added
 * and offers to switch to it. Adding a place doesn't change the active place,
 * so switching is the user's choice. Without a place id, only Done is offered.
 */
export function PlaceAddedView({ placeId, name }: PlaceAddedViewProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const [switching, setSwitching] = useState(false);

  // The panel can be closed (and another one opened) while a switch runs.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleSwitch = useCallback(async () => {
    if (!placeId) return;
    setSwitching(true);
    try {
      await dispatch(switchPlaceThunk(placeId)).unwrap();
      // Don't close a panel the user opened after closing this one.
      if (mounted.current) closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to switch to the new place.' }));
    } finally {
      setSwitching(false);
    }
  }, [placeId, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <p data-testid="add-place-added" className="text-sm text-coot">
        <span className="font-medium text-swift">{name}</span> has been added to your account.
      </p>
      {placeId && (
        <p className="text-sm text-grouse">Switch to it now to set it up, or keep using your current place.</p>
      )}
      <div className="flex gap-2 pt-2">
        {placeId && (
          <button
            onClick={handleSwitch}
            data-testid="add-place-switch"
            disabled={switching}
            className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
          >
            {switching ? 'Switching…' : `Switch to ${name}`}
          </button>
        )}
        <button
          onClick={closeRight}
          data-testid="add-place-done"
          disabled={switching}
          className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}
