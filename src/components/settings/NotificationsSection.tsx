'use client';

import { useAppSelector } from '@/store/hooks';
import { AlarmCallTreeCard } from './AlarmCallTreeCard';
import { PushNotificationsCard } from './PushNotificationsCard';
import { EmailNotificationsCard } from './EmailNotificationsCard';
import { QuietHoursCard } from './QuietHoursCard';

/** Settings → Notifications: call tree, push devices, email and quiet hours. */
export function NotificationsSection() {
  const personId = useAppSelector((s) => s.auth.person?.personId);

  if (!personId) {
    return <p data-testid="notifications-signed-out" className="text-grouse">Loading notification settings…</p>;
  }

  return (
    <div className="space-y-6">
      <AlarmCallTreeCard />
      {/* Keyed by person so a different sign-in reloads the person's settings. */}
      <PushNotificationsCard key={`push-${personId}`} personId={personId} />
      <EmailNotificationsCard key={`email-${personId}`} personId={personId} />
      <QuietHoursCard />
    </div>
  );
}
