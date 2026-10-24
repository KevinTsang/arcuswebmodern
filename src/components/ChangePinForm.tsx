'use client';

/**
 * Reusable PIN code form — used by AcceptInvitationPanel, invite/page,
 * and create-account/page.
 *
 * Handles PIN + Confirm PIN inputs, 4-8 digit validation, and
 * Save / Skip actions. The actual Bridge call is the caller's
 * responsibility via the `onSave` callback.
 */

import { useState, useCallback, FormEvent } from 'react';

export interface ChangePinFormProps {
  /** Called with the validated PIN when the user clicks Save. */
  onSave: (pin: string) => void;
  /** Called when the user clicks Skip. */
  onSkip: () => void;
  /** Disable buttons and show spinner while the parent saves. */
  loading?: boolean;
  /** External error (e.g. "Failed to save PIN code. Please try again."). */
  error?: string | null;
  /** Descriptive text shown above the inputs. */
  description?: string;
  /** Label for the save button. Default: "Set PIN". */
  saveLabel?: string;
  /** Label for the save button while loading. Default: "Setting PIN…". */
  savingLabel?: string;
}

export default function ChangePinForm({
  onSave,
  onSkip,
  loading = false,
  error = null,
  description = 'Set a PIN code to disarm your security alarm and unlock doors.',
  saveLabel = 'Set PIN',
  savingLabel = 'Setting PIN…',
}: ChangePinFormProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (ev: FormEvent) => {
      ev.preventDefault();
      setValidationError(null);

      if (!/^\d{4,8}$/.test(pin)) {
        setValidationError('PIN must be 4-8 digits.');
        return;
      }
      if (pin !== confirmPin) {
        setValidationError('PIN codes do not match.');
        return;
      }

      onSave(pin);
    },
    [pin, confirmPin, onSave],
  );

  const displayError = validationError ?? error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-grouse">{description}</p>

      {displayError && (
        <p data-testid="pin-error" className="text-sm text-cardinal">{displayError}</p>
      )}

      <div>
        <label htmlFor="change-pin" className="block text-sm text-grouse mb-1">
          PIN Code
        </label>
        <input
          id="change-pin"
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="4-8 digits"
          className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
        />
      </div>

      <div>
        <label htmlFor="change-pin-confirm" className="block text-sm text-grouse mb-1">
          Confirm PIN Code
        </label>
        <input
          id="change-pin-confirm"
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          placeholder="4-8 digits"
          className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="pin-save"
          disabled={loading}
          className="flex-1 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {loading ? savingLabel : saveLabel}
        </button>
        <button
          type="button"
          data-testid="pin-skip"
          onClick={onSkip}
          className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Skip
        </button>
      </div>
    </form>
  );
}
