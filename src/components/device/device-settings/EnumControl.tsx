'use client';

export function EnumControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Record<string, string>;
  onChange: (v: string) => void;
}) {
  const entries = Object.entries(options);

  // Use button group for small option sets, dropdown for larger
  if (entries.length <= 4) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([k, label]) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`
              px-2.5 py-1 text-xs rounded-[var(--border-radius-base)] transition-colors
              ${value === k
                ? 'bg-peacock text-crane'
                : 'bg-pigeon text-coot hover:bg-heron'}
            `}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 text-sm rounded-[var(--border-radius-base)] border border-heron bg-crane text-swift"
    >
      {entries.map(([k, label]) => (
        <option key={k} value={k}>{label}</option>
      ))}
    </select>
  );
}
