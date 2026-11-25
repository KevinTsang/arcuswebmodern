'use client';

/**
 * AlarmNotificationList — ordered call tree for alarm notifications.
 *
 * Displays the list of contacts who will be notified when an alarm
 * triggers. Contacts can be reordered, enabled, or disabled. As in the
 * legacy client, the place owner is always notified and at most six people
 * can be enabled.
 */

/** The legacy client's limit on enabled alarm contacts. */
const MAX_ENABLED_ALARM_CONTACTS = 6;

import { Base, AlarmSubsystem } from '@arcus/core';
import { useAlarmSubsystem } from '@/hooks/useAlarmSubsystem';
import { usePlaceOwnerAddress } from '@/hooks/usePlaceOwnerAddress';
import { CallTreeList } from './CallTreeList';

export function AlarmNotificationList() {
  const alarm = useAlarmSubsystem();
  const alarmAddr = alarm.alarmSubsystem?.[Base.ATTR_ADDRESS] as string | undefined;
  const ownerAddress = usePlaceOwnerAddress();

  return (
    <CallTreeList
      callTree={alarm.callTree}
      subsystemAddress={alarmAddr}
      attribute={AlarmSubsystem.ATTR_CALLTREE}
      label="alarm notification list"
      lockedPersonAddress={ownerAddress}
      maxEnabled={MAX_ENABLED_ALARM_CONTACTS}
      description="People will be notified in this order when an alarm is triggered."
      emptyMessage="No contacts configured for alarm notifications."
    />
  );
}
