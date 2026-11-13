'use client';

/**
 * CareBehaviorTemperatureField — the low/high temperature range for
 * "Monitor Home Temperature". Shown in °F, stored in °C (`lowTemp`,
 * `highTemp`), and kept at least MIN_TEMP_GAP_F apart.
 */

import { useCallback } from 'react';
import { cToF } from '@/hooks/useDeviceConfig';
import { fToC, MIN_TEMP_GAP_F } from '@/lib/careBehaviors';
import type { CareBehaviorFieldProps } from './careBehaviorTypes';

const DEFAULT_MIN_F = 20;
const DEFAULT_MAX_F = 105;

interface TemperaturePatch {
  lowTemp?: number;
  highTemp?: number;
}

export function CareBehaviorTemperatureField({ behavior, field, onChange }: CareBehaviorFieldProps) {
  const minF = parseInt(field.values[0] ?? '', 10) || DEFAULT_MIN_F;
  const maxF = parseInt(field.values[1] ?? '', 10) || DEFAULT_MAX_F;
  const lowF = behavior.lowTemp != null ? cToF(behavior.lowTemp) : minF;
  const highF = behavior.highTemp != null ? cToF(behavior.highTemp) : maxF;

  const lowOptions: number[] = [];
  for (let f = minF; f <= maxF - MIN_TEMP_GAP_F; f++) lowOptions.push(f);
  const highOptions: number[] = [];
  for (let f = minF + MIN_TEMP_GAP_F; f <= maxF; f++) highOptions.push(f);

  // Moving one end too close to the other pushes the other end along.
  const setLow = useCallback((f: number) => {
    const patch: TemperaturePatch = { lowTemp: fToC(f) };
    if (highF - f < MIN_TEMP_GAP_F) patch.highTemp = fToC(f + MIN_TEMP_GAP_F);
    onChange(patch);
  }, [highF, onChange]);

  const setHigh = useCallback((f: number) => {
    const patch: TemperaturePatch = { highTemp: fToC(f) };
    if (f - lowF < MIN_TEMP_GAP_F) patch.lowTemp = fToC(f - MIN_TEMP_GAP_F);
    onChange(patch);
  }, [lowF, onChange]);

  const selectClass = 'text-sm border border-heron rounded px-2 py-1 bg-crane text-swift';

  return (
    <div className="flex items-center gap-3 text-sm text-coot">
      <label className="flex items-center gap-1">
        Low
        <select data-testid="care-field-temp-low" value={lowF} onChange={(e) => setLow(parseInt(e.target.value, 10))} className={selectClass}>
          {lowOptions.map((f) => <option key={f} value={f}>{f}°F</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1">
        High
        <select data-testid="care-field-temp-high" value={highF} onChange={(e) => setHigh(parseInt(e.target.value, 10))} className={selectClass}>
          {highOptions.map((f) => <option key={f} value={f}>{f}°F</option>)}
        </select>
      </label>
    </div>
  );
}
