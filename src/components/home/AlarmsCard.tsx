import { useAppSelector } from '@/store/hooks';
import { selectAllIncidents } from '@/store/slices/incidentsSlice';
import { useAlarmSubsystem } from '@/hooks/useSubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function AlarmsCard() {
  const alarm = useAlarmSubsystem();
  const incidents = useAppSelector(selectAllIncidents);
  const place = useAppSelector((s) => s.place.place);
  const isPromon = (place?.['place:serviceLevel'] as string)?.includes('PROMON');

  const activeIncident = incidents.find(
    (i) => i['incident:alertState'] === 'ALERT',
  );

  return (
    <CardShell
      title="Alarms"
      icon="icon-app-alarm-1"
      href="/services"
      badge={isPromon ? (
        <span className="text-[10px] bg-peacock/10 text-peacock rounded-full px-2 py-0.5 font-medium">
          Pro
        </span>
      ) : undefined}
    >
      {activeIncident ? (
        <div className="bg-cardinal/5 border border-cardinal/20 rounded p-3">
          <p className="text-sm font-medium text-cardinal">Alarm Active</p>
          <p className="text-xs text-grouse mt-0.5">
            {String(activeIncident['incident:alert'] ?? 'Security alert in progress')}
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          <StatusBadge
            label="Security"
            value={alarm.securityMode === 'OFF' ? 'Disarmed' : alarm.securityMode}
            color={alarm.securityMode === 'OFF' ? 'text-grouse' : 'text-honeycreeper'}
          />
          <StatusBadge
            label="Devices"
            value={`${alarm.offlineDevices.length} offline`}
            color={alarm.offlineDevices.length > 0 ? 'text-canary' : 'text-grouse'}
          />
        </div>
      )}
    </CardShell>
  );
}
