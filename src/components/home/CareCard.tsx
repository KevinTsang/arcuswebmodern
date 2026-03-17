import { CareSubsystem } from '@arcus/core';
import { useCareSubsystem } from '@/hooks/useSubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function CareCard() {
  const care = useCareSubsystem();

  return (
    <CardShell title="Care" icon="icon-app-heart-1" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="Status"
          value={care.alarmState === CareSubsystem.ALARMSTATE_ALERT ? 'Alert' : 'OK'}
          color={care.alarmState === CareSubsystem.ALARMSTATE_ALERT ? 'text-cardinal' : 'text-honeycreeper'}
        />
        <StatusBadge
          label="Behaviors"
          value={String(care.behaviors.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}
