export default function StatusBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  // transforms label into a slug for test ids, e.g. "Alarm Status" -> "alarm-status"
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return (
    <div data-testid={`status-badge-${slug}`}>
      <p data-testid={`status-value-${slug}`} className={`text-lg font-light ${color}`}>{value}</p>
      <p className="text-xs text-grouse">{label}</p>
    </div>
  );
}
