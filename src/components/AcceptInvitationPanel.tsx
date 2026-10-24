'use client';

/**
 * AcceptInvitationPanel — side panel for accepting or declining invitations.
 *
 * Ports src/components/invite/accept/accept.js. Shows a list of pending
 * invitations with Accept/Decline actions. After accepting, prompts for
 * a PIN code for the new place.
 */

import { useState, useEffect, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Person } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setInvitations } from '@/store/slices/invitationsSlice';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import ChangePinForm from '@/components/ChangePinForm';
import type { Invitation } from '@/store/slices/invitationsSlice';

type PanelView = 'invites' | 'pin';

export default function AcceptInvitationPanel() {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const person = useAppSelector((s) => s.auth.person);
  const invitations = useAppSelector((s) => s.invitations.invitations);

  const [view, setView] = useState<PanelView>('invites');
  const [newPlaceId, setNewPlaceId] = useState<string | null>(null);
  const [acceptedInvitation, setAcceptedInvitation] = useState<Invitation | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);

  const personAddress = person
    ? `SERV:person:${person.personId}`
    : null;

  const fetchInvitations = useCallback(async () => {
    if (!personAddress) return;
    try {
      const { invitations: list } = await Bridge.request<{ invitations: Invitation[] }>(
        Person.CMD_PENDINGINVITATIONS,
        personAddress,
        {},
      );
      dispatch(setInvitations(list ?? []));
    } catch {
      // silently fail — invitations list stays unchanged
    }
  }, [personAddress, dispatch]);

  // Fetch on mount
  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Auto-close when all invitations handled
  useEffect(() => {
    if (hasResponded && invitations.length === 0 && view === 'invites') {
      closeRight();
    }
  }, [hasResponded, invitations.length, view, closeRight]);

  const handleAccept = useCallback(
    async (invitation: Invitation) => {
      if (!personAddress) return;
      setFormError(null);
      setBusy(true);
      try {
        await Bridge.request(Person.CMD_ACCEPTINVITATION, personAddress, {
          code: invitation.code,
          inviteeEmail: invitation.inviteeEmail,
        });
        setNewPlaceId(invitation.placeId);
        setAcceptedInvitation(invitation);
        setView('pin');
      } catch {
        setFormError("Hmm... something's wrong. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [personAddress],
  );

  const handleDecline = useCallback(
    async (invitation: Invitation) => {
      if (!personAddress) return;
      setFormError(null);
      setBusy(true);
      try {
        await Bridge.request(Person.CMD_REJECTINVITATION, personAddress, {
          code: invitation.code,
          inviteeEmail: invitation.inviteeEmail,
        });
        setHasResponded(true);
        await fetchInvitations();
      } catch {
        setFormError("Hmm... something's wrong. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [personAddress, fetchInvitations],
  );

  const handleSavePin = useCallback(async (pinValue: string) => {
    setPinError(null);
    if (!personAddress || !newPlaceId) return;

    setBusy(true);
    try {
      await Bridge.restfulRequest(Person.CMD_CHANGEPINV2, personAddress, {
        place: newPlaceId,
        pin: pinValue,
      });
      setHasResponded(true);
      setView('invites');
      setNewPlaceId(null);

      const placeName = acceptedInvitation?.placeName ?? 'the place';
      dispatch(
        addNotification({
          type: 'success',
          message: `You now have access to ${placeName}!`,
        }),
      );

      await fetchInvitations();
    } catch {
      setPinError('Failed to save PIN. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [personAddress, newPlaceId, acceptedInvitation, dispatch, fetchInvitations]);

  const handleSkipPin = useCallback(async () => {
    setHasResponded(true);
    setView('invites');
    setNewPlaceId(null);

    const placeName = acceptedInvitation?.placeName ?? 'the place';
    dispatch(
      addNotification({
        type: 'success',
        message: `You now have access to ${placeName}!`,
      }),
    );

    await fetchInvitations();
  }, [acceptedInvitation, dispatch, fetchInvitations]);

  // ── PIN view ────────────────────────────────────────────────────────
  if (view === 'pin') {
    return (
      <div className="p-4 space-y-4">
        <h3 data-testid="invitation-pin-title" className="text-lg font-semibold text-swift">Create a PIN Code</h3>
        <ChangePinForm
          onSave={handleSavePin}
          onSkip={handleSkipPin}
          loading={busy}
          error={pinError}
          description="This PIN Code will only be used for this place and will be used to disarm the alarm, unlock locks, and more."
          saveLabel="Save PIN"
          savingLabel="Saving…"
        />
      </div>
    );
  }

  // ── Invitations list view ───────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="invitations-panel-title" className="text-lg font-semibold text-swift">Invitations</h3>
      <hr className="border-heron" />

      {formError && (
        <p data-testid="invitation-form-error" className="text-sm text-cardinal">{formError}</p>
      )}

      {invitations.length === 0 ? (
        <p data-testid="pending-invitations-empty" className="text-sm text-grouse">You have no pending invitations.</p>
      ) : (
        invitations.map((inv) => (
          <div key={inv.code} data-testid={`pending-invitation-${inv.code}`} className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-peacock/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-swift">{inv.placeName}</h4>
                {(inv.streetAddress1 || inv.city) && (
                  <p className="text-xs text-grouse">
                    {[inv.streetAddress1, inv.streetAddress2].filter(Boolean).join(', ')}
                    {inv.city && (
                      <>
                        {inv.streetAddress1 ? ', ' : ''}
                        {inv.city}{inv.stateProv ? `, ${inv.stateProv}` : ''} {inv.zipCode ?? ''}
                      </>
                    )}
                  </p>
                )}
                <p className="text-xs text-grouse mt-1">
                  Invited by {inv.invitorFirstName} {inv.invitorLastName}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pl-13">
              <button
                onClick={() => handleAccept(inv)}
                data-testid={`pending-invitation-accept-${inv.code}`}
                disabled={busy}
                className="px-4 py-1.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => handleDecline(inv)}
                data-testid={`pending-invitation-decline-${inv.code}`}
                disabled={busy}
                className="px-4 py-1.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon disabled:opacity-50"
              >
                Decline
              </button>
            </div>

            <hr className="border-heron" />
          </div>
        ))
      )}
    </div>
  );
}
