interface BooleanSelectorProps {
  name: string;
  current: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function BooleanSelector({ name, current, onChange }: BooleanSelectorProps) {
  const val = current === true || current === 'true';
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-grouse">{name}</span>
      <button
        onClick={() => onChange(name, !val)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? 'bg-peacock' : 'bg-heron'}`}
        role="switch"
        aria-checked={val}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
