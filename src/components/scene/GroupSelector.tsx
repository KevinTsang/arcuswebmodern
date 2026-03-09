import { SceneDeviceConfigurator } from './SceneDeviceConfigurator';
import type { SelectorProps } from './types';

export function GroupSelector({ sel, current, values, onChange }: SelectorProps) {
  const key = sel.name;

  if (sel.options!.length === 2) {
    // Toggle switch for 2-option groups (ON/OFF, LOCKED/UNLOCKED)
    const isFirst = current === sel.options![0].value;
    const activeOpt = sel.options!.find((o) => o.value === current);
    return (
      <div key={key}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-grouse">{sel.name}</span>
          <button
            onClick={() => onChange(key, isFirst ? sel.options![1].value : sel.options![0].value)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${!isFirst ? 'bg-peacock' : 'bg-heron'}
            `}
            role="switch"
            aria-checked={!isFirst}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform ${!isFirst ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <span className="text-xs text-swift">{isFirst ? sel.options![0].label : sel.options![1].label}</span>
        {activeOpt?.selectors && activeOpt.selectors.length > 0 && (
          <SceneDeviceConfigurator selectors={activeOpt.selectors} values={values} onChange={onChange} />
        )}
      </div>
    );
  }

  // Radio buttons for 3+ option groups
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
      {sel.options!.map((opt) =>
        opt.value === current && opt.selectors && opt.selectors.length > 0 ? (
          <SceneDeviceConfigurator key={opt.value} selectors={opt.selectors} values={values} onChange={onChange} />
        ) : null,
      )}
    </div>
  );
}
