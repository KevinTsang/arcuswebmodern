'use client';

import type { useFormValidation } from '@/hooks/useFormValidation';

interface FormFieldProps {
  label: string;
  id: string;
  /** The validation key for this field, when it differs from the input `id`. Defaults to `id`. */
  name?: string;
  /** Classes for the wrapping element, e.g. spacing. */
  className?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  form?: ReturnType<typeof useFormValidation>;
  allValues?: Record<string, string>;
  inputMode?: 'numeric' | 'text';
}

export default function FormField({
  label, id, name = id, className, value, onChange, type = 'text', autoComplete,
  form, allValues, inputMode,
}: FormFieldProps) {
  const errors = form && allValues
    ? form.visited[name] ? form.getFieldErrors(name) : []
    : [];

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-swift mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          form?.markChanged(name);
        }}
        onBlur={() => {
          form?.markVisited(name);
          if (allValues) {
            form?.validateSingle(name, value, allValues);
          }
        }}
        className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] text-sm focus:outline-none focus:border-peacock"
      />
      {errors.length > 0 && (
        <p className="mt-1 text-sm text-cardinal">{errors[0]}</p>
      )}
    </div>
  );
}
