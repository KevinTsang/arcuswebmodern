'use client';

/**
 * CareBehaviorOpenCountField — for "Monitor Memory Habits" (OPEN_COUNT):
 * choose the devices to watch and the most times each may open per day
 * (`openCount`, keyed by device address).
 */

import { useCallback, useMemo } from 'react';
import { DEFAULT_OPEN_COUNT } from '@/lib/careBehaviors';
import { useCareTemplateDevices } from '@/hooks/useCareTemplateDevices';
import type { CareBehaviorFieldProps } from './careBehaviorTypes';

export function CareBehaviorOpenCountField({ behavior, field, template, onChange }: CareBehaviorFieldProps) {
  const devices = useCareTemplateDevices(template.availableDevices);
  const openCount = useMemo(() => behavior.openCount ?? {}, [behavior.openCount]);

  const toggle = useCallback((address: string, checked: boolean) => {
    const next = { ...openCount };
    if (checked) next[address] = DEFAULT_OPEN_COUNT;
    else delete next[address];
    onChange({ openCount: next });
  }, [openCount, onChange]);

  const setLimit = useCallback((address: string, limit: number) => {
    onChange({ openCount: { ...openCount, [address]: limit } });
  }, [openCount, onChange]);

  if (devices.length === 0) {
    return <p data-testid="care-field-open-count-empty" className="text-xs text-grouse">No compatible devices are paired.</p>;
  }

  return (
    <div className="space-y-1.5">
      {devices.map((device) => {
        const limit = openCount[device.address];
        const checked = limit != null;
        return (
          <div key={device.address} className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-swift min-w-0">
              <input
                type="checkbox"
                data-testid={`care-field-open-device-${device.address}`}
                checked={checked}
                onChange={(e) => toggle(device.address, e.target.checked)}
              />
              <span className="truncate">{device.name}</span>
            </label>
            {checked && (
              <select
                aria-label={`Maximum opens for ${device.name}`}
                data-testid={`care-field-open-limit-${device.address}`}
                value={String(limit)}
                onChange={(e) => setLimit(device.address, parseInt(e.target.value, 10))}
                className="text-sm border border-heron rounded px-2 py-1 bg-crane text-swift"
              >
                {field.values.map((v) => (
                  <option key={v} value={v}>{v} {v === '1' ? 'time' : 'times'}</option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
