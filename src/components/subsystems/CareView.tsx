'use client';

/**
 * CareView — care subsystem with behaviors and activity.
 *
 * Replaces src/components/subsystem/care/. Shows care behaviors,
 * alert state, and care device status.
 */

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, CareSubsystem } from '@arcus/core';
import { useCareSubsystem } from '@/hooks/useCareSubsystem';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { testIdSlug } from '@/lib/testId';
import { CareBehaviors } from './CareBehaviors';

type CareViewTab = 'status' | 'behaviors';

export function CareView() {
  const [tab, setTab] = useState<CareViewTab>('status');

  return (
    <div>
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('status')}
          data-testid="care-tab-status"
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            tab === 'status' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
          }`}
        >
          Status
        </button>
        <button
          onClick={() => setTab('behaviors')}
          data-testid="care-tab-behaviors"
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            tab === 'behaviors' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
          }`}
        >
          Behaviors
        </button>
      </div>

      {tab === 'status' ? <CareStatus /> : <CareBehaviors />}
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
      await Bridge.request('subcare:Clear', addr, {});
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
            : care.alarmMode === CareSubsystem.ALARMMODE_ON ? 'Care is active' : 'Care is monitoring'}
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
        {care.silent && <p data-testid="care-silent" className="mt-1">Silent mode is on</p>}
      </div>
    </div>
  );
}
