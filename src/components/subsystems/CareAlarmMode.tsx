'use client';

/**
 * CareAlarmMode — turn the care alarm ON or OFF.
 *
 * "Off" is the platform's VISIT mode: behaviors stay configured but no care
 * alarm is raised (for example while a caregiver is visiting). As in the
 * legacy client, the mode can't be changed until at least one behavior
 * exists.
 */

import { useState, useCallback } from 'react';
import { Base, CareSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useCareSubsystem } from '@/hooks/useCareSubsystem';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

type CareAlarmModeValue = typeof CareSubsystem.ALARMMODE_ON | typeof CareSubsystem.ALARMMODE_VISIT;

const MODE_OPTIONS: Array<{ mode: CareAlarmModeValue; label: string; testId: string }> = [
  { mode: CareSubsystem.ALARMMODE_ON, label: 'On', testId: 'care-mode-on' },
  { mode: CareSubsystem.ALARMMODE_VISIT, label: 'Off', testId: 'care-mode-off' },
];

export function CareAlarmMode() {
  const dispatch = useAppDispatch();
  const care = useCareSubsystem();
  const [saving, setSaving] = useState(false);

  const address = care.subsystem?.[Base.ATTR_ADDRESS] as string | undefined;
  const total = care.behaviors.length;
  const activeCount = care.behaviors.filter((b) => b.enabled !== false).length;
  const isOff = care.alarmMode === CareSubsystem.ALARMMODE_VISIT;

  const handleSetMode = useCallback(async (mode: CareAlarmModeValue) => {
    if (!address) return;
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, { [CareSubsystem.ATTR_ALARMMODE]: mode });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to change care alarm mode' }));
    }
    setSaving(false);
  }, [address, dispatch]);

  let summary: string;
  if (total === 0) summary = 'Add a behavior to turn on the care alarm.';
  else if (isOff) summary = 'Off — behaviors will not raise a care alarm.';
  else summary = `On — ${activeCount} of ${total} behavior${total !== 1 ? 's' : ''} active.`;

  return (
    <div
      data-testid="care-mode"
      data-mode={care.alarmMode}
      className="flex items-center justify-between gap-4 rounded-[var(--border-radius-base)] border border-heron p-4"
    >
      <div>
        <h3 className="text-sm font-medium text-swift">Care Alarm</h3>
        <p data-testid="care-mode-summary" className="text-xs text-grouse mt-0.5">{summary}</p>
      </div>
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1" role="group" aria-label="Care alarm mode">
        {MODE_OPTIONS.map(({ mode, label, testId }) => {
          const selected = care.alarmMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleSetMode(mode)}
              disabled={saving || total === 0 || selected || !address}
              aria-pressed={selected}
              data-testid={testId}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                selected ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot disabled:opacity-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
