import { useSubsystemDevices } from '@/hooks/useSubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function WaterCard() {
  const waterDevices = useSubsystemDevices('subwater', ['waterval:valvestate']);

  const closedCount = waterDevices.filter(
    (d) => d['waterval:valvestate'] === 'CLOSED',
  ).length;

  return (
    <CardShell title="Water" icon="icon-app-water-1" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="Valves Closed"
          value={String(closedCount)}
          color="text-grouse"
        />
        <StatusBadge
          label="Devices"
          value={String(waterDevices.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}
