'use client';

/**
 * CareView — care subsystem with behaviors and activity.
 *
 * Replaces src/components/subsystem/care/. Shows alert state, the care
 * alarm mode and silent setting, the activity timeline, behaviors and the
 * devices the care service watches.
 */

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, CareSubsystem } from '@arcus/core';
import { useCareSubsystem } from '@/hooks/useCareSubsystem';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { testIdSlug } from '@/lib/testId';
import { CareAlarmMode } from './CareAlarmMode';
import { CareSilentToggle } from './CareSilentToggle';
import { CareActivity } from './CareActivity';
import { CareDevices } from './CareDevices';

type CareViewTab = 'status' | 'activity' | 'behaviors' | 'devices';

const TABS: Array<{ id: CareViewTab; label: string }> = [
  { id: 'status', label: 'Status' },
  { id: 'activity', label: 'Activity' },
  { id: 'behaviors', label: 'Behaviors' },
  { id: 'devices', label: 'Devices' },
];

export function CareView() {
  const [tab, setTab] = useState<CareViewTab>('status');

  return (
    <div>
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            data-testid={`care-tab-${id}`}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === id ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'status' && <CareStatus />}
      {tab === 'activity' && <CareActivity />}
      {tab === 'behaviors' && <CareBehaviors />}
      {tab === 'devices' && <CareDevices />}
    </div>
  );
}

function CareStatus() {
  const dispatch = useAppDispatch();
  const care = useCareSubsystem();

  const isAlert = care.alarmState === CareSubsystem.ALARMSTATE_ALERT;

  const handleClear = useCallback(async () => {
    if (!care.subsystem) return;
    const addr = care.subsystem[Base.ATTR_ADDRESS] as string;
    try {
      await Bridge.request(CareSubsystem.CMD_CLEAR, addr, {});
      dispatch(addNotification({ type: 'success', message: 'Care alert cleared' }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to clear alert' }));
    }
  }, [care.subsystem, dispatch]);

  return (
    <div className="space-y-6">
      {/* Alert state */}
      <div className={`rounded-[var(--border-radius-base)] p-6 text-center ${
        isAlert ? 'bg-cardinal/10 border border-cardinal/30' : 'bg-pigeon/50'
      }`}>
        <div data-testid="care-state" data-alert={isAlert} className={`text-xl font-bold mb-1 ${isAlert ? 'text-cardinal' : 'text-honeycreeper'}`}>
          {isAlert ? 'CARE ALERT' : 'All Clear'}
        </div>
        <p data-testid="care-summary" className="text-sm text-grouse">
          {isAlert && care.lastAlertCause
            ? care.lastAlertCause
            : care.alarmMode === CareSubsystem.ALARMMODE_VISIT ? 'Care alarm is off' : 'Care is active'}
        </p>
        {isAlert && (
          <button
            onClick={handleClear}
            data-testid="care-clear"
            className="mt-3 bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] text-sm hover:opacity-90"
          >
            Clear Alert
          </button>
        )}
      </div>

      <CareAlarmMode />

      {/* Behaviors summary */}
      {care.behaviors.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-swift mb-3">Active Behaviors</h3>
          <div className="space-y-2">
            {care.behaviors.map((behavior, i) => {
              const name = (behavior['name'] as string) ?? `Behavior ${i + 1}`;
              const enabled = behavior['enabled'] !== false;
              return (
                <div key={i} data-testid={`care-behavior-${testIdSlug(name)}`} className={`flex items-center justify-between px-3 py-2 rounded border border-heron ${!enabled ? 'opacity-50' : ''}`}>
                  <span className="text-sm text-swift">{name}</span>
                  <span data-testid={`care-behavior-status-${testIdSlug(name)}`} className={`text-xs ${enabled ? 'text-honeycreeper' : 'text-grouse'}`}>
                    {enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-grouse">
        <p data-testid="care-device-count">{care.careDevices.length} care device{care.careDevices.length !== 1 ? 's' : ''} monitored</p>
      </div>

      <CareSilentToggle />
    </div>
  );
}

function CareBehaviors() {
  const care = useCareSubsystem();

  if (care.behaviors.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-grouse mb-2">No behaviors configured.</p>
        <p className="text-sm text-grouse">
          Care behaviors monitor activity patterns and alert you when something unusual happens.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-grouse mb-4">
        Manage your care behaviors. Full behavior editing will be available in a future update.
      </p>
      {care.behaviors.map((behavior, i) => {
        const name = (behavior['name'] as string) ?? `Behavior ${i + 1}`;
        const description = (behavior['description'] as string) ?? '';
        const enabled = behavior['enabled'] !== false;
        const type = (behavior['type'] as string) ?? '';

        return (
          <div key={i} data-testid={`care-behavior-detail-${testIdSlug(name)}`} className={`border rounded-[var(--border-radius-base)] p-4 ${
            enabled ? 'border-heron' : 'border-heron opacity-60'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-swift">{name}</h4>
                {description && <p className="text-xs text-grouse mt-1">{description}</p>}
                {type && <p className="text-xs text-grouse mt-0.5">Type: {type}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                enabled ? 'bg-honeycreeper/10 text-honeycreeper' : 'bg-pigeon text-grouse'
              }`}>
                {enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
