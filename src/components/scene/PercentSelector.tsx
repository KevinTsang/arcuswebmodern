import type { SelectorProps } from './types';

export function PercentSelector({ sel, current, onChange }: SelectorProps) {
  const key = sel.name;
  const val = typeof current === 'number' ? current : (sel.min ?? 10);
  return (
    <div key={key}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-grouse">{sel.name}</span>
        <span className="text-xs text-swift font-medium">{val}%</span>
      </div>
      <input
        type="range"
        min={sel.min ?? 0}
        max={sel.max ?? 100}
        step={sel.step ?? 10}
        value={val}
        onChange={(e) => onChange(key, Number(e.target.value))}
        className="w-full accent-peacock"
      />
    </div>
  );
}
