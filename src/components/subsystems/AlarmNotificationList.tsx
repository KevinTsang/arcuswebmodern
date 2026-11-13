'use client';

/**
 * AlarmNotificationList — ordered call tree for alarm notifications.
 *
 * Displays the list of contacts who will be notified when an alarm
 * triggers. Contacts can be reordered, enabled, or disabled.
 */

import { Base, AlarmSubsystem } from '@arcus/core';
import { useAlarmSubsystem } from '@/hooks/useAlarmSubsystem';
import { CallTreeList } from './CallTreeList';

export function AlarmNotificationList() {
  const alarm = useAlarmSubsystem();
  const alarmAddr = alarm.alarmSubsystem?.[Base.ATTR_ADDRESS] as string | undefined;

  return (
    <CallTreeList
      callTree={alarm.callTree}
      subsystemAddress={alarmAddr}
      attribute={AlarmSubsystem.ATTR_CALLTREE}
      description="People will be notified in this order when an alarm is triggered."
      emptyMessage="No contacts configured for alarm notifications."
    />
  );
}
