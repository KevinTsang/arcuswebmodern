'use client';

/**
 * CareDevices — choose which care-capable devices the care service watches
 * (`subcare:careDevices`, a subset of `subcare:careCapableDevices`). Only
 * these devices feed behaviors and the activity timeline.
 */

import { useMemo, useState, useCallback } from 'react';
import { Base, CareSubsystem, Device } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useCareSubsystem } from '@/hooks/useCareSubsystem';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { addNotification } from '@/store/slices/uiSlice';

export function CareDevices() {
  const dispatch = useAppDispatch();
  const care = useCareSubsystem();
  const allDevices = useAppSelector(selectAllDevices);
  const [saving, setSaving] = useState<string | null>(null);

  const address = care.subsystem?.[Base.ATTR_ADDRESS] as string | undefined;

  const capableDevices = useMemo(
    () => allDevices
      .filter((d) => care.careCapableDevices.includes(d[Base.ATTR_ADDRESS]))
      .sort((a, b) => ((a[Device.ATTR_NAME] as string) ?? '').localeCompare((b[Device.ATTR_NAME] as string) ?? '')),
    [allDevices, care.careCapableDevices],
  );

  const handleToggle = useCallback(async (deviceAddr: string) => {
    if (!address) return;
    const selected = care.careDevices.includes(deviceAddr);
    const next = selected
      ? care.careDevices.filter((a) => a !== deviceAddr)
      : [...care.careDevices, deviceAddr];
    setSaving(deviceAddr);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, { [CareSubsystem.ATTR_CAREDEVICES]: next });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update care devices' }));
    }
    setSaving(null);
  }, [address, care.careDevices, dispatch]);

  if (capableDevices.length === 0) {
    return (
      <div data-testid="care-devices-empty" className="text-center py-8">
        <p className="text-grouse mb-2">No care-capable devices.</p>
        <p className="text-sm text-grouse">
          Motion, contact and other sensors you pair can be used by the care service.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h3 className="text-base font-medium text-swift mb-1">Care Devices</h3>
      <p data-testid="care-devices-summary" className="text-xs text-grouse mb-3">
        {care.careDevices.filter((a) => care.careCapableDevices.includes(a)).length} of {capableDevices.length} devices
        monitored. Behaviors and the activity timeline only use the devices selected here.
      </p>
      <div className="space-y-2">
        {capableDevices.map((device) => {
          const addr = device[Base.ATTR_ADDRESS];
          const name = (device[Device.ATTR_NAME] as string) ?? 'Unknown device';
          const selected = care.careDevices.includes(addr);
          return (
            <label
              key={addr}
              data-testid={`care-device-${addr}`}
              data-selected={selected}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-heron cursor-pointer"
            >
              <span className="text-sm text-swift flex-1 min-w-0 truncate">{name}</span>
              <input
                type="checkbox"
                data-testid={`care-device-toggle-${addr}`}
                checked={selected}
                disabled={saving !== null || !address}
                onChange={() => handleToggle(addr)}
                aria-label={`Monitor ${name}`}
                className="h-4 w-4 accent-peacock disabled:opacity-50"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
