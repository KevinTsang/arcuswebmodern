export default function StatusBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <p className={`text-lg font-light ${color}`}>{value}</p>
      <p className="text-xs text-grouse">{label}</p>
    </div>
  );
}
