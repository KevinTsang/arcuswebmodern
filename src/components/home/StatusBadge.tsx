import { testIdSlug } from '@/lib/testId';
import { useTestIdScope } from '@/lib/testIdScope';

export default function StatusBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  // Test ids are scoped by the enclosing card: "Total" on Doors & Locks →
  // "status-value-doors-locks-total", so badges with the same label stay unique.
  const card = useTestIdScope();
  const slug = card ? `${card}-${testIdSlug(label)}` : testIdSlug(label);

  return (
    <div data-testid={`status-badge-${slug}`}>
      <p data-testid={`status-value-${slug}`} className={`text-lg font-light ${color}`}>{value}</p>
      <p className="text-xs text-grouse">{label}</p>
    </div>
  );
}
