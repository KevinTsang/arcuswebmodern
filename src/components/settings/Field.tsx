'use client';

import { testIdSlug } from '@/lib/testId';

export default function Field({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  /** Validation message shown under the input. */
  error?: string;
}) {
  const slug = testIdSlug(label);
  return (
    <div>
      <label className="block text-sm text-grouse mb-1">{label}</label>
      <input
        type={type}
        data-testid={`field-${slug}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
      />
      {error && (
        <p data-testid={`field-${slug}-error`} className="mt-1 text-sm text-cardinal">{error}</p>
      )}
    </div>
  );
}
