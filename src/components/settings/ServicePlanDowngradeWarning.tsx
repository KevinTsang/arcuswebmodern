'use client';

import { PREMIUM_FEATURES, isBasicLevel, isPremiumLevel, isPromonLevel } from './servicePlans';

interface ServicePlanDowngradeWarningProps {
  /** The place's current service level. */
  from: string;
  /** The service level the owner picked. */
  to: string;
}

/** Lists what the place loses by moving from `from` to `to`; renders nothing for an upgrade. */
export function ServicePlanDowngradeWarning({ from, to }: ServicePlanDowngradeWarningProps) {
  const losses: string[] = [];
  if (isPromonLevel(from) && !isPromonLevel(to)) {
    losses.push('24/7 professional monitoring of burglary, smoke, fire, carbon monoxide and panic alarms');
  }
  if (isPremiumLevel(from) && isBasicLevel(to)) {
    losses.push(...PREMIUM_FEATURES);
  }
  if (losses.length === 0) return null;

  return (
    <div
      data-testid="service-plan-downgrade-warning"
      role="alert"
      className="p-3 border border-heron rounded-[var(--border-radius-base)] bg-pigeon/40 space-y-2"
    >
      <p className="text-sm font-medium text-swift">Are you sure? This place will lose:</p>
      <ul className="list-disc pl-5 space-y-1 text-xs text-coot">
        {losses.map((loss) => <li key={loss}>{loss}</li>)}
      </ul>
    </div>
  );
}
