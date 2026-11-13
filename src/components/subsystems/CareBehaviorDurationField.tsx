'use client';

/**
 * CareBehaviorDurationField — pick how long inactivity / an open door lasts
 * before the behavior triggers (`durationSecs`), from the template's values.
 */

import { durationToSeconds, formatDurationValue } from '@/lib/careBehaviors';
import type { CareBehaviorFieldProps } from './careBehaviorTypes';

export function CareBehaviorDurationField({ behavior, field, onChange }: CareBehaviorFieldProps) {
  const options = field.values.map((v) => ({
    secs: durationToSeconds(v, field.unit),
    label: formatDurationValue(parseInt(v, 10), field.unit),
  }));
  const current = options.some((o) => o.secs === behavior.durationSecs) ? String(behavior.durationSecs) : '';

  return (
    <select
      aria-label={field.label || 'Duration'}
      data-testid="care-field-duration"
      value={current}
      onChange={(e) => onChange({ durationSecs: parseInt(e.target.value, 10) })}
      className="text-sm border border-heron rounded px-2 py-1 bg-crane text-swift"
    >
      {current === '' && <option value="">Choose…</option>}
      {options.map((o) => (
        <option key={o.secs} value={o.secs}>{o.label}</option>
      ))}
    </select>
  );
}
