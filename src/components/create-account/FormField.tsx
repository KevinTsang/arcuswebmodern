'use client';

import type { useFormValidation } from '@/hooks/useFormValidation';

interface FormFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  form?: ReturnType<typeof useFormValidation>;
  allValues?: Record<string, string>;
  inputMode?: 'numeric' | 'text';
}

export default function FormField({
  label, id, value, onChange, type = 'text', autoComplete,
  form, allValues, inputMode,
}: FormFieldProps) {
  const errors = form && allValues
    ? form.visited[id] ? form.getFieldErrors(id) : []
    : [];

  return (
    <div>
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
          form?.markChanged(id);
        }}
        onBlur={() => {
          form?.markVisited(id);
          if (allValues) {
            form?.validateSingle(id, value, allValues);
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
