'use client';

import { useCallback, type ChangeEvent } from 'react';

interface ProMonPlanSelectorProps {
  /** True when the annual plan is selected. */
  annual: boolean;
  onChange: (annual: boolean) => void;
  disabled?: boolean;
}

const PLANS = [
  { annual: false, key: 'monthly', label: 'Monthly', description: 'Billed every month' },
  { annual: true, key: 'annual', label: 'Annual', description: 'Billed once a year' },
];

/**
 * Monthly vs annual billing choice for the pro monitoring plan. Only rendered
 * when yearly subscriptions are enabled (ARCUS_ENABLE_YEARLY_SUBSCRIPTION).
 */
export function ProMonPlanSelector({ annual, onChange, disabled }: ProMonPlanSelectorProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value === 'annual'),
    [onChange],
  );

  return (
    <fieldset data-testid="promon-plan" disabled={disabled}>
      <legend className="block text-sm font-medium text-swift mb-1">Billing</legend>
      <div className="grid grid-cols-2 gap-2">
        {PLANS.map((plan) => {
          const selected = plan.annual === annual;
          return (
            <label
              key={plan.key}
              className={`flex items-start gap-2 p-3 border rounded-[var(--border-radius-base)] cursor-pointer ${
                selected ? 'border-peacock bg-peacock/5' : 'border-heron'
              }`}
            >
              <input
                type="radio"
                name="promon-plan"
                value={plan.key}
                checked={selected}
                onChange={handleChange}
                data-testid={`promon-plan-${plan.key}`}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-swift">{plan.label}</span>
                <span className="block text-xs text-grouse">{plan.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
