'use client';

/**
 * AlarmDeviceParticipation — configure which devices participate in
 * each alarm mode (ON / PARTIAL).
 *
 * Each device can participate in: neither mode, ON only, PARTIAL only,
 * or both modes.
 */

import { useState, useCallback } from 'react';
import { Base, Device, SecurityAlarmMode } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAlarmSubsystem } from '@/hooks/useAlarmSubsystem';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { addNotification } from '@/store/slices/uiSlice';

type ParticipationLevel = 'none' | 'on' | 'partial' | 'both';

const PARTICIPATION_LABELS: Record<ParticipationLevel, string> = {
  none: 'Not Participating',
  on: 'ON Only',
  partial: 'Partial Only',
  both: 'ON & Partial',
};

function getParticipation(address: string, onDevices: string[], partialDevices: string[]): ParticipationLevel {
  const inOn = onDevices.includes(address);
  const inPartial = partialDevices.includes(address);
  if (inOn && inPartial) return 'both';
  if (inOn) return 'on';
  if (inPartial) return 'partial';
  return 'none';
}

export function AlarmDeviceParticipation() {
  const dispatch = useAppDispatch();
  const alarm = useAlarmSubsystem();
  const allDevices = useAppSelector(selectAllDevices);
  const [saving, setSaving] = useState<string | null>(null);

  const securityAddr = alarm.securitySubsystem?.[Base.ATTR_ADDRESS] as string | undefined;
  const onDevices = alarm.modeSettings.ON.devices;
  const partialDevices = alarm.modeSettings.PARTIAL.devices;

  const securityDeviceEntities = allDevices.filter((d) =>
    alarm.securityDevices.includes(d[Base.ATTR_ADDRESS]),
  );

  const handleChange = useCallback(async (deviceAddr: string, level: ParticipationLevel) => {
    if (!securityAddr) return;
    setSaving(deviceAddr);

    const newOnDevices = onDevices.filter((a) => a !== deviceAddr);
    const newPartialDevices = partialDevices.filter((a) => a !== deviceAddr);

    if (level === 'on' || level === 'both') newOnDevices.push(deviceAddr);
    if (level === 'partial' || level === 'both') newPartialDevices.push(deviceAddr);

    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, securityAddr, {
        [`${SecurityAlarmMode.ATTR_DEVICES}:ON`]: newOnDevices,
        [`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`]: newPartialDevices,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update device participation' }));
    }
    setSaving(null);
  }, [securityAddr, onDevices, partialDevices, dispatch]);

  if (securityDeviceEntities.length === 0) {
    return (
      <div>
        <h3 className="text-base font-medium text-swift mb-2">Device Participation</h3>
        <p className="text-sm text-grouse">No security devices configured.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-base font-medium text-swift mb-1">Device Participation</h3>
      <p className="text-xs text-grouse mb-3">
        Choose which alarm modes each device participates in.
      </p>
      <div className="space-y-2">
        {securityDeviceEntities.map((device) => {
          const addr = device[Base.ATTR_ADDRESS];
          const name = (device[Device.ATTR_NAME] as string) ?? 'Unknown';
          const current = getParticipation(addr, onDevices, partialDevices);
          const isSaving = saving === addr;

          return (
            <div key={device.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-heron">
              <span className="text-sm text-swift flex-1 min-w-0 truncate">{name}</span>
              <select
                value={current}
                onChange={(e) => handleChange(addr, e.target.value as ParticipationLevel)}
                disabled={isSaving}
                className="text-sm border border-heron rounded px-2 py-1 bg-crane text-swift disabled:opacity-50"
              >
                <option value="both">{PARTICIPATION_LABELS.both}</option>
                <option value="on">{PARTICIPATION_LABELS.on}</option>
                <option value="partial">{PARTICIPATION_LABELS.partial}</option>
                <option value="none">{PARTICIPATION_LABELS.none}</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
