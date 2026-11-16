'use client';

import { useState, useCallback, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Person } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { validateFields, type ValidationConstraints } from '@/hooks/useFormValidation';
import { EMAIL_RULE, confirmEmailRule } from '@/lib/validationRules';
import Field from './Field';

const CONSTRAINTS: ValidationConstraints = {
  email: EMAIL_RULE,
  confirmEmail: confirmEmailRule('email'),
};

/** A platform error, e.g. `{ code: 'error.signup.emailinuse' }`. */
interface PlatformError {
  code?: string;
  message?: string;
}

/** The message to show when the platform refuses the new email. */
function saveErrorMessage(e: PlatformError): string {
  if (e.code && /inuse|exists|duplicate/i.test(e.code)) {
    return 'That email is already used by another account.';
  }
  return 'Unable to change your email. Please try again.';
}

interface ChangeEmailPanelProps {
  personId: string;
  currentEmail: string;
  /** Called with the new email once the platform has saved it. */
  onSaved: (email: string) => void;
}

/**
 * Changes the person's email, which is also the address they sign in with.
 * The new address needs to be verified again.
 */
export default function ChangeEmailPanel({ personId, currentEmail, onSaved }: ChangeEmailPanelProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const trimmed = email.trim();
  const values = useMemo(() => ({ email: trimmed, confirmEmail: confirmEmail.trim() }), [trimmed, confirmEmail]);
  const errors = useMemo(() => {
    const found = validateFields(CONSTRAINTS, Object.keys(CONSTRAINTS), values);
    if (!found.email && trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      found.email = ['is already your email'];
    }
    return found;
  }, [values, trimmed, currentEmail]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, `SERV:person:${personId}`, { [Person.ATTR_EMAIL]: trimmed });
      onSaved(trimmed);
      dispatch(addNotification({ type: 'success', message: 'Email changed. Use it the next time you sign in.' }));
      closeRight();
    } catch (e) {
      setError(saveErrorMessage((e ?? {}) as PlatformError));
      dispatch(addNotification({ type: 'error', message: 'Failed to change email.' }));
    } finally {
      setSaving(false);
    }
  }, [saving, errors, personId, trimmed, onSaved, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-grouse">
        Current email: <span data-testid="change-email-current" className="text-swift">{currentEmail || '—'}</span>
      </p>
      <Field
        id="change-email"
        label="New Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        disabled={saving}
        error={showErrors ? errors.email?.[0] : undefined}
      />
      <Field
        id="change-email-confirm"
        label="Confirm New Email"
        type="email"
        autoComplete="email"
        value={confirmEmail}
        onChange={setConfirmEmail}
        disabled={saving}
        error={showErrors ? errors.confirmEmail?.[0] : undefined}
      />
      <p className="text-xs text-grouse">You will sign in with the new email, and will need to verify it.</p>
      {error && <p data-testid="change-email-error" className="text-sm text-cardinal">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          data-testid="change-email-save"
          disabled={saving || !email || !confirmEmail}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Change Email'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}
