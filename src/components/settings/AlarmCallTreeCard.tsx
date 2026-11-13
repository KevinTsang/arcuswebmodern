'use client';

import Link from 'next/link';
import { useAlarmSubsystem } from '@/hooks/useAlarmSubsystem';
import { AlarmNotificationList } from '@/components/subsystems/AlarmNotificationList';
import InfoCard from './InfoCard';

/**
 * The alarm notification call tree, reused from the Alarms settings page so it
 * can be managed from Settings too. Links to the rest of the alarm settings.
 */
export function AlarmCallTreeCard() {
  const { alarmSubsystem } = useAlarmSubsystem();

  return (
    <InfoCard
      title="Alarm Call Tree"
      action={
        <Link
          href="/services/alarms/settings"
          data-testid="alarm-call-tree-link"
          className="text-sm text-peacock hover:underline"
        >
          Alarm settings
        </Link>
      }
    >
      {alarmSubsystem ? (
        <AlarmNotificationList />
      ) : (
        <p data-testid="alarm-call-tree-unavailable" className="text-sm text-grouse">
          Alarms aren&apos;t available at this place.
        </p>
      )}
    </InfoCard>
  );
}
