'use client';

/**
 * S2PinEntryForm — the PIN box and actions of the S2 PIN prompt.
 *
 * Only digits can be typed, at most five. The parent checks the value and
 * sends it; this form just reports what the user did.
 */

import { useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

interface S2PinEntryFormProps {
  pin: string;
  error: string | null;
  /** False when this browser can't scan, so the option is hidden. */
  canScan: boolean;
  onPinChange: (pin: string) => void;
  onSubmit: () => void;
  onScan: () => void;
  onDecline: () => void;
}

const primary = 'flex-1 py-2 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane hover:bg-peacock/90 disabled:opacity-50';
const secondary = 'flex-1 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon';

export function S2PinEntryForm({ pin, error, canScan, onPinChange, onSubmit, onScan, onDecline }: S2PinEntryFormProps) {
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onPinChange(e.target.value.replace(/\D/g, '').slice(0, 5));
  }, [onPinChange]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  }, [onSubmit]);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="s2-pin-input" className="block text-sm font-medium text-swift mb-1">
        PIN: the first five digits of the DSK on the label
      </label>
      <input
        id="s2-pin-input"
        data-testid="s2-pin-input"
        value={pin}
        onChange={handleChange}
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        placeholder="00000"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 's2-pin-error' : undefined}
        className="w-full px-3 py-2 font-mono text-lg tracking-widest border border-heron rounded-[var(--border-radius-base)] bg-crane text-swift focus:outline-none focus:border-peacock"
      />
      {error && (
        <p id="s2-pin-error" data-testid="s2-pin-error" role="alert" className="text-sm text-cardinal mt-1">
          {error}
        </p>
      )}
      <div className="flex gap-2 mt-4">
        <button type="submit" data-testid="s2-pin-submit" disabled={pin.length !== 5} className={primary}>
          Submit PIN
        </button>
        {canScan && (
          <button type="button" data-testid="s2-pin-scan" onClick={onScan} className={secondary}>
            Scan QR code
          </button>
        )}
      </div>
      <button
        type="button"
        data-testid="s2-pin-decline"
        onClick={onDecline}
        className="w-full mt-3 text-sm text-coot hover:underline"
      >
        The numbers don&apos;t match, or I can&apos;t find the PIN
      </button>
    </form>
  );
}
