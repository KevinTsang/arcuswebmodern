import { useDoorsLocksSubsystem } from '@/hooks/useDoorsLocksSubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function DoorsLocksCard() {
  const dl = useDoorsLocksSubsystem();
  const unlockedCount = dl.unlockedCount;
  const openCount = dl.openCount;

  return (
    <CardShell title="Doors & Locks" icon="icon-platform-lock-1" href="/services/doors-locks/status">
      <div className="flex gap-4">
        <StatusBadge
          label="Unlocked"
          value={String(unlockedCount)}
          color={unlockedCount > 0 ? 'text-canary' : 'text-honeycreeper'}
        />
        <StatusBadge
          label="Open"
          value={String(openCount)}
          color={openCount > 0 ? 'text-canary' : 'text-honeycreeper'}
        />
        <StatusBadge
          label="Total"
          value={String(dl.locks.length + dl.contacts.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}
