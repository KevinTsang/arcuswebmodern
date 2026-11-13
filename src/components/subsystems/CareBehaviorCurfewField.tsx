'use client';

/**
 * CareBehaviorCurfewField — the time by which someone must be home for
 * the "Curfew" behavior (`presenceRequiredTime`, "HH:mm:ss" in place time).
 */

import type { CareBehaviorFieldProps } from './careBehaviorTypes';

export function CareBehaviorCurfewField({ behavior, field, onChange }: CareBehaviorFieldProps) {
  const value = (behavior.presenceRequiredTime ?? '').slice(0, 5);
  return (
    <input
      type="time"
      aria-label={field.label || 'Curfew Time'}
      data-testid="care-field-time"
      value={value}
      onChange={(e) => onChange({ presenceRequiredTime: e.target.value ? `${e.target.value}:00` : undefined })}
      className="text-sm border border-heron rounded px-2 py-1 bg-crane text-swift"
    />
  );
}
