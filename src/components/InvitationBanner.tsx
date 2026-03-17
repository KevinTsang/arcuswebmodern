'use client';

/**
 * InvitationBanner — displays a clickable banner below the header when
 * the current user has pending invitations.
 *
 * Ports the "You've been invited!" context-bar behavior from
 * src/components/context-bar/context-bar.js.
 */

import { useAppSelector } from '@/store/hooks';
import { useSidePanel } from '@/components/SidePanel';
import AcceptInvitationPanel from '@/components/AcceptInvitationPanel';

export default function InvitationBanner() {
  const invitations = useAppSelector((s) => s.invitations.invitations);
  const { openRight } = useSidePanel();

  const count = invitations.length;
  if (count === 0) return null;

  return (
    <button
      onClick={() => openRight(<AcceptInvitationPanel />)}
      className="w-full bg-peacock text-crane px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-peacock/90 transition-colors"
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span>
        You&apos;ve been invited! You have {count} pending invitation{count > 1 ? 's' : ''}.
      </span>
    </button>
  );
}
