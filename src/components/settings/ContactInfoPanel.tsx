'use client';

import { use, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import type { ContactLoad } from './contactInfo';
import ContactInfoForm from './ContactInfoForm';

interface ContactInfoPanelProps {
  /** The person's contact info, loaded when the panel was opened; null without a signed-in person. */
  person: Promise<ContactLoad> | null;
  /** Reopens the panel with a fresh load for `personId`. */
  onReload: (personId: string) => void;
}

/**
 * Side panel for editing the signed-in person's name and phone. Suspends until
 * `person` resolves (see useOpenContactInfoPanel), then shows the form, or an
 * error with a retry when the load failed.
 */
export default function ContactInfoPanel({ person, onReload }: ContactInfoPanelProps) {
  const personId = useAppSelector((s) => s.auth.person?.personId);
  const load = personId && person ? use(person) : null;
  // The signed-in person changed after the panel opened: load the new person instead.
  const stale = !!personId && !!load && load.personId !== personId;

  useEffect(() => {
    if (personId && stale) onReload(personId);
  }, [personId, stale, onReload]);

  if (!personId || !load) {
    return (
      <p data-testid="contact-signed-out" className="p-4 text-sm text-cardinal">
        Your session has ended. Sign in again to edit your contact info.
      </p>
    );
  }

  if (stale) {
    return <p data-testid="contact-loading" className="p-4 text-sm text-grouse">Loading contact info…</p>;
  }

  if (load.status === 'error') {
    return (
      <div className="p-4 space-y-2">
        <p data-testid="contact-load-error" className="text-sm text-cardinal">
          Unable to load your contact info.
        </p>
        <button data-testid="contact-retry" onClick={() => onReload(personId)} className="text-sm text-peacock hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return <ContactInfoForm personId={load.personId} loaded={load.loaded} />;
}
