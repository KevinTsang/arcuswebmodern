import { useSubsystemDevices } from '@/hooks/useSubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function LightsSwitchesCard() {
  const lightDevices = useSubsystemDevices('sublightsnswitches', ['swit:state']);

  const onCount = lightDevices.filter(
    (d) => d['swit:state'] === 'ON',
  ).length;

  return (
    <CardShell title="Lights & Switches" icon="icon-app-light-1" href="/services">
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
