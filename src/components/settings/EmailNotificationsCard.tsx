'use client';

import { useCallback, useEffect, useState } from 'react';
import { Base, Person } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import SettingToggle from '../SettingToggle';
import InfoCard from './InfoCard';
import type { PersonEmailPrefs } from './types';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Email preferences. The platform's only per-person email setting is
 * `person:consentOffersPromotions` (the legacy profile's promotional-email
 * opt-in): a timestamp when opted in, 0 when opted out. Alarm and account
 * emails have no preference to change. The person is loaded with
 * `base:GetAttributes`, since `auth.person` may be just the session payload.
 */
export function EmailNotificationsCard({ personId }: { personId: string }) {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<LoadState>('loading');
  const [email, setEmail] = useState('');
  const [optedIn, setOptedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const personAddress = `SERV:person:${personId}`;

  // Starts in 'loading' (and the section keys this card by person), so the
  // effect never sets state synchronously; only a retry resets it.
  const load = useCallback(() => {
    Bridge.request<PersonEmailPrefs>(Base.CMD_GETATTRIBUTES, personAddress, {}).then(
      (attrs) => {
        setEmail(attrs?.[Person.ATTR_EMAIL] ?? '');
        setOptedIn((attrs?.[Person.ATTR_CONSENTOFFERSPROMOTIONS] ?? 0) > 0);
        setState('ready');
      },
      () => {
        setState('error');
        dispatch(addNotification({ type: 'error', message: 'Failed to load email preferences.' }));
      },
    );
  }, [personAddress, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = useCallback(() => {
    setState('loading');
    load();
  }, [load]);

  const handleToggle = useCallback(async () => {
    if (saving) return;
    const next = !optedIn;
    setOptedIn(next);
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, personAddress, {
        [Person.ATTR_CONSENTOFFERSPROMOTIONS]: next ? Date.now() : 0,
      });
    } catch {
      setOptedIn(!next);
      dispatch(addNotification({ type: 'error', message: 'Failed to update email preferences.' }));
    } finally {
      setSaving(false);
    }
  }, [saving, optedIn, personAddress, dispatch]);

  return (
    <InfoCard title="Email Notifications">
      {state === 'loading' && (
        <p data-testid="email-prefs-loading" className="text-sm text-grouse">Loading email preferences…</p>
      )}
      {state === 'error' && (
        <div className="space-y-1">
          <p data-testid="email-prefs-error" className="text-sm text-cardinal">Unable to load your email preferences.</p>
          <button data-testid="email-prefs-retry" onClick={handleRetry}className="text-sm text-peacock hover:underline">
            Try again
          </button>
        </div>
      )}
      {state === 'ready' && (
        <>
          <SettingToggle
            label="Promotional emails"
            description="Receive news, offers and promotions by email."
            enabled={optedIn}
            onToggle={handleToggle}
            testId="email-prefs-promotions"
          />
          <p data-testid="email-prefs-note" className="text-xs text-grouse">
            Account emails, such as password resets, are always sent to {email || 'your email address'}.
            Who is notified about alarms is set by the alarm call tree.
          </p>
        </>
      )}
    </InfoCard>
  );
}
