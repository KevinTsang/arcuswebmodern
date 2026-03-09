import { SelectorType, type SelectorProps } from './types';

export function RangeSelector({ sel, current, onChange }: SelectorProps) {
  const key = sel.name;
  const val = typeof current === 'number' ? current : (sel.min ?? 0);
  return (
    <div key={key}>
      <span className="text-xs text-grouse block mb-1">{sel.name}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(key, Math.max(sel.min ?? 0, val - (sel.step ?? 1)))}
          className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm"
        >-</button>
        <span className="text-sm text-swift font-medium min-w-[3rem] text-center">
          {val}{sel.type === SelectorType.DURATION ? 's' : ''}
        </span>
        <button
          onClick={() => onChange(key, Math.min(sel.max ?? 999, val + (sel.step ?? 1)))}
          className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm"
        >+</button>
      </div>
    </div>
  );
}
