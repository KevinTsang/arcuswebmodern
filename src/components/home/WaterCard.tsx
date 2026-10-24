import { Valve, WaterSubsystem } from '@arcus/core';
import { useSubsystemDevices } from '@/hooks/useSubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function WaterCard() {
  const waterDevices = useSubsystemDevices(WaterSubsystem.NAMESPACE);

  const closedCount = waterDevices.filter(
    (d) => d[Valve.ATTR_VALVESTATE] === Valve.VALVESTATE_CLOSED,
  ).length;

  return (
    <CardShell title="Water" icon="icon-platform-water-1" href="/services/water/status">
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
