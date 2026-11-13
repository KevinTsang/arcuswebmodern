'use client';

import type { Invitation } from '@arcus/core/services/types';

interface PendingInvitationRowProps {
  invitation: Invitation;
  /** Opens the cancel confirmation; omitted when the viewer can't cancel it. */
  onCancel?: (invitation: Invitation) => void;
  /** `data-testid` for the row; the Cancel button gets `<testId>-cancel`. */
  testId: string;
}

/** An invitation sent for a place that hasn't been accepted yet. */
export default function PendingInvitationRow({ invitation, onCancel, testId }: PendingInvitationRowProps) {
  const name = `${invitation.inviteeFirstName ?? ''} ${invitation.inviteeLastName ?? ''}`.trim();
  const email = invitation.inviteeEmail ?? '';

  return (
    <div data-testid={testId} className="flex items-center justify-between px-3 py-2 rounded border border-dashed border-heron">
      <div className="min-w-0">
        <p className="text-sm text-swift truncate">{name || email}</p>
        {name && email && <p className="text-xs text-grouse truncate">{email}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-grouse">Invitation Sent</span>
        {onCancel && (
          <button
            onClick={() => onCancel(invitation)}
            data-testid={`${testId}-cancel`}
            className="text-xs text-cardinal hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
