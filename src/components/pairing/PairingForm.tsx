'use client';

/**
 * Pairing form — ported from the form shown on the last legacy pairing step
 * (components/pairing/steps). Cloud products ask for details such as a serial
 * number or device code before searching; the values are sent with
 * `subpairing:Search`. Hidden inputs keep their preset value and are not shown.
 */

import { useCallback, useState } from 'react';
import type { PairingInput } from '@/arcus/types';
import { validateFormInput, type PairingFormValues } from '@/lib/cloudPairing';

interface PairingFormProps {
  form: PairingInput[];
  values: PairingFormValues;
  onChange: (name: string, value: string) => void;
}

export function PairingForm({ form, values, onChange }: PairingFormProps) {
  const [touched, setTouched] = useState<Set<string>>(() => new Set());

  const handleBlur = useCallback((name: string) => {
    setTouched((prev) => new Set(prev).add(name));
  }, []);

  const visible = form.filter((input) => input.type !== 'HIDDEN');
  if (visible.length === 0) return null;

  return (
    <div data-testid="pairing-form" className="space-y-3 mb-4">
      {visible.map((input) => {
        const value = values[input.name] ?? '';
        const error = touched.has(input.name) ? validateFormInput(input, value) : null;
        const id = `pairing-form-${input.name}`;
        return (
          <div key={input.name}>
            <label htmlFor={id} className="block text-sm font-medium text-swift mb-1">
              {input.label}
            </label>
            <input
              id={id}
              data-testid={id}
              type="text"
              value={value}
              maxLength={input.maxlen}
              required={input.required}
              aria-invalid={error ? true : undefined}
              onChange={(e) => onChange(input.name, e.target.value)}
              onBlur={() => handleBlur(input.name)}
              className="w-full px-3 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-swift bg-crane focus:outline-none focus:border-peacock"
            />
            {error && (
              <p data-testid={`${id}-error`} className="text-xs text-cardinal mt-1">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
