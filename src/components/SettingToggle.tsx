/**
 * SettingToggle — labeled toggle switch for boolean settings.
 */

export default function SettingToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-heron">
      <div>
        <p className="text-sm font-medium text-swift">{label}</p>
        <p className="text-xs text-grouse mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-peacock' : 'bg-heron'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}
