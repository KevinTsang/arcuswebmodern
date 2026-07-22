import { useHomeFamilySubsystem } from '@/hooks/useHomeFamilySubsystem';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

export default function HomeFamilyCard() {
  const hf = useHomeFamilySubsystem();

  return (
    <CardShell title="Home & Family" icon="icon-app-people" href="/services/home-family/status">
      <div className="flex gap-4">
        <StatusBadge
          label="Home"
          value={String(hf.peopleAtHome.length)}
          color="text-honeycreeper"
        />
        <StatusBadge
          label="Away"
          value={String(hf.peopleAway.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}
