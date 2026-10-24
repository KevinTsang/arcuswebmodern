'use client';

/**
 * AlarmsView — alarm subsystem status and controls.
 *
 * Replaces src/components/subsystem/alarms/. Shows security alarm
 * state, arm/disarm controls, and device participation.
 *
 * The status/settings tabs are route-driven: /services/alarms/<action>.
 */

import Link from 'next/link';
import { AlarmSettings } from './AlarmSettings';
import { AlarmStatus } from './AlarmStatus';

const TABS = [
  { action: 'status', label: 'Status' },
  { action: 'settings', label: 'Settings' },
] as const;

export function AlarmsView({ action = 'status' }: { action?: string }) {
  const activeAction = action === 'settings' ? 'settings' : 'status';

  return (
    <div>
      {/* Sub-navigation (route-driven tabs) */}
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.action}
            href={`/services/alarms/${tab.action}`}
            data-testid={`alarm-tab-${tab.action}`}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeAction === tab.action
                ? 'bg-crane text-swift shadow-sm'
                : 'text-grouse hover:text-coot'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeAction === 'status' ? <AlarmStatus /> : <AlarmSettings />}
    </div>
  );
}
