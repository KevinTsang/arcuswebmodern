'use client';

import { useCallback, useEffect, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Person } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import InfoCard from './InfoCard';
import InfoRow from './InfoRow';
import ChangeEmailPanel from './ChangeEmailPanel';

/** The person attributes the email card reads. */
interface PersonEmailAttributes {
  [Person.ATTR_EMAIL]?: string;
  /** When the person verified their current email; missing until they do. */
  [Person.ATTR_EMAILVERIFIED]?: number;
}

/** Where the verification request comes from, for `person:SendVerificationEmail`. */
const VERIFICATION_SOURCE = 'WEB';

type Verification = 'loading' | 'verified' | 'unverified' | 'unknown';

interface EmailState {
  /** The person id and session email the state was loaded for. */
  key: string;
  email: string;
  verification: Verification;
}

const STATUS_LABEL: Record<Verification, string> = {
  loading: 'Checking…',
  verified: 'Verified',
  unverified: 'Not verified',
  unknown: '—',
};

/**
 * Shows the person's login email and whether it has been verified, with
 * Change (opens ChangeEmailPanel) and, until it is verified, a button that
 * sends a new verification email.
 */
export default function EmailCard() {
  const personId = useAppSelector((s) => s.auth.person?.personId);
  const sessionEmail = useAppSelector((s) => s.auth.person?.[Person.ATTR_EMAIL]) ?? '';
  const dispatch = useAppDispatch();
  const { openRight } = useSidePanel();

  // What the platform reported, for the person and session email it was loaded for.
  const [loaded, setLoaded] = useState<EmailState | null>(null);
  const [sending, setSending] = useState(false);

  // Reload when the email changes: a new address starts out unverified.
  const loadKey = `${personId ?? ''}|${sessionEmail}`;
  const current = loaded?.key === loadKey ? loaded : null;
  const email = current?.email ?? sessionEmail;
  const verification: Verification = current?.verification ?? 'loading';

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    Bridge.request<PersonEmailAttributes>(Base.CMD_GETATTRIBUTES, `SERV:person:${personId}`, {})
      .then((attrs) => {
        if (cancelled) return;
        setLoaded({
          key: loadKey,
          email: attrs[Person.ATTR_EMAIL] ?? sessionEmail,
          verification: attrs[Person.ATTR_EMAILVERIFIED] ? 'verified' : 'unverified',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded({ key: loadKey, email: sessionEmail, verification: 'unknown' });
        dispatch(addNotification({ type: 'error', message: 'Failed to load email verification status.' }));
      });
    return () => {
      cancelled = true;
    };
  }, [personId, sessionEmail, loadKey, dispatch]);

  // The platform clears the verification when the email changes.
  const handleSaved = useCallback(
    (newEmail: string) => setLoaded({ key: loadKey, email: newEmail, verification: 'unverified' }),
    [loadKey],
  );

  const handleChange = useCallback(() => {
    if (!personId) return;
    openRight(<ChangeEmailPanel personId={personId} currentEmail={email} onSaved={handleSaved} />, {
      title: 'Change Email',
      key: 'change-email',
    });
  }, [personId, email, openRight, handleSaved]);

  const handleSendVerification = useCallback(async () => {
    if (!personId || sending) return;
    setSending(true);
    try {
      await Bridge.restfulRequest(Person.CMD_SENDVERIFICATIONEMAIL, `SERV:person:${personId}`, {
        source: VERIFICATION_SOURCE,
      });
      dispatch(addNotification({ type: 'success', message: `Verification email sent to ${email}.` }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to send verification email.' }));
    } finally {
      setSending(false);
    }
  }, [personId, sending, email, dispatch]);

  return (
    <InfoCard
      title="Email"
      action={
        <button onClick={handleChange} disabled={!personId} className="text-sm text-peacock hover:underline disabled:opacity-50">
          Change
        </button>
      }
    >
      <InfoRow label="Email" value={email || '—'} />
      <InfoRow label="Status" value={STATUS_LABEL[verification]} />
      {verification === 'unverified' && (
        <button
          data-testid="email-send-verification"
          onClick={handleSendVerification}
          disabled={sending}
          className="text-sm text-peacock hover:underline disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send verification email'}
        </button>
      )}
    </InfoCard>
  );
}
