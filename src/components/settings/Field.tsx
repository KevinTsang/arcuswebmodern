'use client';

import { useId } from 'react';
import { testIdSlug } from '@/lib/testId';

export default function Field({
  id: idProp,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  disabled,
  error,
}: {
  /** The input's id. Defaults to a generated one; pass a fixed id where it must be stable (snapshots). */
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  /** Validation message shown under the input and linked to it with aria-describedby. */
  error?: string;
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const slug = testIdSlug(label);
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-grouse mb-1">{label}</label>
      <input
        id={id}
        type={type}
        data-testid={`field-${slug}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock disabled:opacity-50"
      />
      {error && (
        <p id={errorId} data-testid={`field-${slug}-error`} className="mt-1 text-sm text-cardinal">{error}</p>
      )}
    </div>
  );
}
