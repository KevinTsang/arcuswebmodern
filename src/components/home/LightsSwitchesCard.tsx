import { LightsNSwitchesSubsystem, Switch } from '@arcus/core';
import { useSubsystemDevices } from '@/hooks/useSubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function LightsSwitchesCard() {
  const lightDevices = useSubsystemDevices(LightsNSwitchesSubsystem.NAMESPACE);

  const onCount = lightDevices.filter(
    (d) => d[Switch.ATTR_STATE] === Switch.STATE_ON,
  ).length;

  return (
    <CardShell title="Lights & Switches" icon="icon-platform-light-1" href="/services/lights-switches/status">
      <div className="flex gap-4">
        <StatusBadge
          label="On"
          value={String(onCount)}
          color={onCount > 0 ? 'text-canary' : 'text-grouse'}
        />
        <StatusBadge
          label="Total"
          value={String(lightDevices.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}
