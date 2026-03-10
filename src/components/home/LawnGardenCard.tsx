import { useLawnGardenSubsystem } from '@/hooks/useSubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function LawnGardenCard() {
  const lg = useLawnGardenSubsystem();

  return (
    <CardShell title="Lawn & Garden" icon="icon-app-water-1" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="Watering"
          value={String(lg.zonesWatering.length)}
          color={lg.zonesWatering.length > 0 ? 'text-peacock' : 'text-grouse'}
        />
        <StatusBadge
          label="Controllers"
          value={String(lg.controllers.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}
