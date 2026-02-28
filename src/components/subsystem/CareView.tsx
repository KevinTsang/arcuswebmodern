'use client';

/**
 * CareView — care subsystem with behaviors and activity.
 *
 * Replaces src/components/subsystem/care/. Shows care behaviors,
 * alert state, and care device status.
 */

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { useCareSubsystem } from '@/hooks/useSubsystem';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

type CareViewTab = 'status' | 'behaviors';

export function CareView() {
  const [tab, setTab] = useState<CareViewTab>('status');

  return (
    <div>
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('status')}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            tab === 'status' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
          }`}
        >
          Status
        </button>
        <button
          onClick={() => setTab('behaviors')}
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

  const isAlert = care.alarmState === 'ALERT';

  const handleClear = useCallback(async () => {
    if (!care.subsystem) return;
    const addr = care.subsystem['base:address'] as string;
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
        <div className={`text-xl font-bold mb-1 ${isAlert ? 'text-cardinal' : 'text-honeycreeper'}`}>
          {isAlert ? 'CARE ALERT' : 'All Clear'}
        </div>
        <p className="text-sm text-grouse">
          {isAlert && care.lastAlertCause
            ? care.lastAlertCause
            : care.alarmMode === 'ON' ? 'Care is active' : 'Care is monitoring'}
        </p>
        {isAlert && (
          <button
            onClick={handleClear}
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
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded border border-heron ${!enabled ? 'opacity-50' : ''}`}>
                  <span className="text-sm text-swift">{name}</span>
                  <span className={`text-xs ${enabled ? 'text-honeycreeper' : 'text-grouse'}`}>
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
        <p>{care.careDevices.length} care device{care.careDevices.length !== 1 ? 's' : ''} monitored</p>
        {care.silent && <p className="mt-1">Silent mode is on</p>}
      </div>
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
          <div key={i} className={`border rounded-[var(--border-radius-base)] p-4 ${
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
