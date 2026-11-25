'use client';

/**
 * AlarmsView — alarm subsystem status and controls.
 *
 * Replaces src/components/subsystem/alarms/. Shows security alarm
 * state, arm/disarm controls, and device participation.
 *
 * The status/settings tabs are route-driven: /services/alarms/<action>.
 */

import { resolveSubsystemAction } from '@/lib/subsystemTabs';
import { AlarmSettings } from './AlarmSettings';
import { AlarmStatus } from './AlarmStatus';
import { SubsystemTabs } from './SubsystemTabs';

export function AlarmsView({ action }: { action?: string }) {
  const activeAction = resolveSubsystemAction('alarms', action);

  return (
    <div>
      {/* Sub-navigation (route-driven tabs) */}
      <SubsystemTabs slug="alarms" active={activeAction} testIdPrefix="alarm-tab" />

      {activeAction === 'status' ? <AlarmStatus /> : <AlarmSettings />}
    </div>
  );
}
