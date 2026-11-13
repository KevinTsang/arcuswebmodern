import InfoCard from './InfoCard';

/**
 * Quiet hours / do-not-disturb. The platform has no quiet-hours setting (the
 * legacy client didn't either), so this explains where to silence push
 * notifications instead of offering a control that would do nothing.
 */
export function QuietHoursCard() {
  return (
    <InfoCard title="Quiet Hours">
      <p data-testid="quiet-hours-note" className="text-sm text-grouse">
        Arcus doesn&apos;t schedule quiet hours. To pause or stop push notifications, use the notification or
        Do Not Disturb settings on your phone or tablet. Alarm notifications are still sent to the people in
        the alarm call tree.
      </p>
    </InfoCard>
  );
}
