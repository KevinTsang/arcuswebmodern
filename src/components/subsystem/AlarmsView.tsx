'use client';

/**
 * AlarmsView — alarm subsystem status and controls.
 *
 * Replaces src/components/subsystem/alarms/. Shows security alarm
 * state, arm/disarm controls, and device participation.
 */

import { useState, useCallback } from 'react';
import { useAlarmSubsystem } from '@/hooks/useSubsystem';
import { AlarmSettings } from './AlarmSettings';
import { AlarmStatus } from './AlarmStatus';

type AlarmView = 'status' | 'settings';

export function AlarmsView() {
  const [view, setView] = useState<AlarmView>('status');
  const alarm = useAlarmSubsystem();

  return (
    <div>
      {/* Sub-navigation */}
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
        <button
          onClick={() => setView('status')}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            view === 'status' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
          }`}
        >
          Status
        </button>
        <button
          onClick={() => setView('settings')}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            view === 'settings' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
          }`}
        >
          Settings
        </button>
      </div>

      {view === 'status' ? <AlarmStatus /> : <AlarmSettings />}
    </div>
  );
}

