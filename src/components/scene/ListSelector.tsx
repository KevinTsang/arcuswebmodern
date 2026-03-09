import type { SelectorProps } from './types';

export function ListSelector({ sel, current, onChange }: SelectorProps) {
  const key = sel.name;
  return (
    <div key={key}>
      <span className="text-xs text-grouse block mb-1">{sel.name}</span>
      <div className="flex flex-wrap gap-1">
        {sel.options!.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(key, opt.value)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              current === opt.value
                ? 'bg-peacock text-crane border-peacock'
                : 'bg-crane text-swift border-heron hover:border-peacock'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
