'use client';

import { useCallback } from 'react';
import { testIdSlug } from '@/lib/testId';

interface ServicePlanOptionProps {
  level: string;
  name: string;
  summary: string;
  checked: boolean;
  /** This is the place's plan today. */
  current: boolean;
  disabled?: boolean;
  onSelect: (level: string) => void;
}

/** One radio choice in the service plan picker. */
export function ServicePlanOption({ level, name, summary, checked, current, disabled, onSelect }: ServicePlanOptionProps) {
  const handleChange = useCallback(() => onSelect(level), [onSelect, level]);
  const slug = testIdSlug(level);

  return (
    <label
      data-testid={`service-plan-option-${slug}`}
      className={`flex gap-3 p-3 border rounded-[var(--border-radius-base)] ${
        checked ? 'border-peacock bg-peacock/5' : 'border-heron hover:bg-pigeon/40'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input
        type="radio"
        name="service-plan"
        value={level}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        aria-label={name}
        className="mt-1 accent-peacock"
      />
      <span className="space-y-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-swift">{name}</span>
          {current && (
            <span data-testid={`service-plan-current-${slug}`} className="text-xs px-1.5 py-0.5 rounded bg-lovebird/15 text-lovebird">
              Current
            </span>
          )}
        </span>
        <span className="block text-xs text-grouse">{summary}</span>
      </span>
    </label>
  );
}
