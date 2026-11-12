'use client';

import { useCallback } from 'react';
import type { AddPlaceAccess } from '@/lib/addPlaceAccess';

interface AddPlaceControlsProps {
  /** From getAddPlaceAccess. */
  access: AddPlaceAccess;
  /** Opens the Add Place panel for the account the place is added to. */
  onAdd: (accountId: string) => void;
}

const HINTS = {
  switch: 'To add a place, first switch to a place you own.',
  'new-account': 'To add your own place, create a new account using a different email address.',
} as const;

/**
 * The Add Place button: enabled at an owned place, and disabled with a hint
 * explaining why at a guest place. Renders nothing while access is unknown.
 */
export function AddPlaceControls({ access, onAdd }: AddPlaceControlsProps) {
  const handleClick = useCallback(() => {
    if (access.status === 'enabled') onAdd(access.accountId);
  }, [access, onAdd]);

  if (access.status === 'hidden') return null;

  return (
    <div data-testid="add-place-section" className="space-y-2">
      <button
        onClick={handleClick}
        data-testid="add-place"
        disabled={access.status !== 'enabled'}
        className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
      >
        + Add Place
      </button>
      {access.status === 'disabled' && (
        <p data-testid="add-place-hint" className="text-xs text-grouse">
          {HINTS[access.hint]}
        </p>
      )}
    </div>
  );
}
