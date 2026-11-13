'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Place } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';

interface RemovePlacePanelProps {
  placeId: string;
  placeName: string;
  /** Called after the place is deleted. */
  onRemoved?: () => void;
}

const CONFIRM_WORD = 'REMOVE';

/**
 * Deletes a place the person owns (place:Delete), after they type REMOVE and
 * then confirm, as the legacy client's remove-place panel does.
 */
export default function RemovePlacePanel({ placeId, placeName, onRemoved }: RemovePlacePanelProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const typedMatches = typed.trim().toUpperCase() === CONFIRM_WORD;

  const handleSubmit = useCallback(() => {
    if (typedMatches) setConfirming(true);
  }, [typedMatches]);

  const handleRemove = useCallback(async () => {
    setRemoving(true);
    try {
      await Bridge.request(Place.CMD_DELETE, `SERV:place:${placeId}`, {});
      dispatch(addNotification({ type: 'success', message: `${placeName} has been removed from your account.` }));
      onRemoved?.();
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to remove place.' }));
    } finally {
      setRemoving(false);
    }
  }, [placeId, placeName, dispatch, onRemoved, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <p data-testid="remove-place-message" className="text-sm text-swift">
        Removing <span className="font-medium">{placeName}</span> will remove all devices associated with the
        place. We will ensure that any billing plans are cancelled.
      </p>
      {!confirming ? (
        <>
          <p className="text-sm text-grouse">
            Type <span className="font-medium text-swift">{CONFIRM_WORD}</span> below and click Submit.
          </p>
          <Field id="remove-place-confirm-input" label="Confirm" value={typed} onChange={setTyped} placeholder={CONFIRM_WORD} autoComplete="off" />
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              data-testid="remove-place-submit"
              disabled={!typedMatches}
              className="px-4 py-2 bg-cardinal text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-cardinal/90 disabled:opacity-50"
            >
              Submit
            </button>
            <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div data-testid="remove-place-confirm" className="space-y-3 border-t border-heron pt-4">
          <p className="text-sm font-medium text-cardinal">Are you sure?</p>
          <p className="text-sm text-cardinal">This action cannot be reversed.</p>
          <div className="flex gap-2">
            <button
              onClick={handleRemove}
              data-testid="remove-place-delete"
              disabled={removing}
              className="px-4 py-2 bg-cardinal text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-cardinal/90 disabled:opacity-50"
            >
              {removing ? 'Removing…' : 'Remove Place'}
            </button>
            <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
