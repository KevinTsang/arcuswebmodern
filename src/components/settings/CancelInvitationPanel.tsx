'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Place } from '@arcus/core';
import type { Invitation } from '@arcus/core/services/types';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';

interface CancelInvitationPanelProps {
  invitation: Invitation;
  /** The place the invitation is for. */
  placeId: string;
  placeName: string;
  /** Called after the invitation is cancelled. */
  onCancelled?: () => void;
}

/** Confirms and cancels a pending invitation (place:CancelInvitation). */
export default function CancelInvitationPanel({
  invitation,
  placeId,
  placeName,
  onCancelled,
}: CancelInvitationPanelProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const [cancelling, setCancelling] = useState(false);

  const inviteeName =
    `${invitation.inviteeFirstName ?? ''} ${invitation.inviteeLastName ?? ''}`.trim()
    || invitation.inviteeEmail
    || 'this person';

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await Bridge.request(Place.CMD_CANCELINVITATION, `SERV:place:${placeId}`, { code: invitation.code });
      dispatch(addNotification({ type: 'success', message: `Invitation to ${inviteeName} cancelled.` }));
      onCancelled?.();
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to cancel invitation.' }));
    } finally {
      setCancelling(false);
    }
  }, [placeId, invitation.code, inviteeName, dispatch, onCancelled, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm font-medium text-cardinal">Are you sure?</p>
      <p data-testid="cancel-invitation-message" className="text-sm text-swift">
        You will have to re-invite <span className="font-medium">{inviteeName}</span> to give them access
        to <span className="font-medium">{placeName}</span>.
      </p>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCancel}
          data-testid="cancel-invitation-confirm"
          disabled={cancelling}
          className="px-4 py-2 bg-cardinal text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-cardinal/90 disabled:opacity-50"
        >
          {cancelling ? 'Cancelling…' : 'Cancel Invitation'}
        </button>
        <button
          onClick={closeRight}
          data-testid="cancel-invitation-back"
          className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Keep Invitation
        </button>
      </div>
    </div>
  );
}
