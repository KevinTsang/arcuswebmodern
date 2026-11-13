'use client';

/**
 * CareBehaviorDevicesField — choose which of the template's devices take
 * part in a care behavior (`devices`).
 */

import { useCallback, useMemo } from 'react';
import { useCareTemplateDevices } from '@/hooks/useCareTemplateDevices';
import type { CareBehaviorFieldProps } from './careBehaviorTypes';

export function CareBehaviorDevicesField({ behavior, template, onChange }: CareBehaviorFieldProps) {
  const devices = useCareTemplateDevices(template.availableDevices);
  const selected = useMemo(() => behavior.devices ?? [], [behavior.devices]);
  const allSelected = devices.length > 0 && devices.every((d) => selected.includes(d.address));

  const toggle = useCallback((address: string, checked: boolean) => {
    const rest = selected.filter((a) => a !== address);
    onChange({ devices: checked ? [...rest, address] : rest });
  }, [selected, onChange]);

  const toggleAll = useCallback((checked: boolean) => {
    const offered = devices.map((d) => d.address);
    const others = selected.filter((a) => !offered.includes(a));
    onChange({ devices: checked ? [...others, ...offered] : others });
  }, [devices, selected, onChange]);

  if (devices.length === 0) {
    return <p data-testid="care-field-devices-empty" className="text-xs text-grouse">No compatible devices are paired.</p>;
  }

  return (
    <div className="space-y-1.5">
      {devices.length > 1 && (
        <label className="flex items-center gap-2 text-sm text-coot">
          <input
            type="checkbox"
            data-testid="care-field-devices-all"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          Select All
        </label>
      )}
      {devices.map((device) => (
        <label key={device.address} className="flex items-center gap-2 text-sm text-swift">
          <input
            type="checkbox"
            data-testid={`care-field-device-${device.address}`}
            checked={selected.includes(device.address)}
            onChange={(e) => toggle(device.address, e.target.checked)}
          />
          {device.name}
        </label>
      ))}
    </div>
  );
}
