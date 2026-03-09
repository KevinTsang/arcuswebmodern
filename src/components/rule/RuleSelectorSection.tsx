import { useCallback } from 'react';

export interface SelectorOption {
  name: string;
  value: string;
}

export interface ResolvedSelector {
  type: string;
  name: string;
  options: SelectorOption[];
}

/** Determine selector display type based on option value prefixes (matches old arcusweb logic). */
export function getSelectorKind(selector: ResolvedSelector): 'device' | 'generic' {
  if (selector.options.length === 0) return 'generic';
  const first = selector.options[0].value;
  const last = selector.options[selector.options.length - 1].value;
  const headType = first.split(':')[1] ?? '';
  const tailType = last.split(':')[1] ?? '';
  if (headType === 'dev' && tailType === 'dev') return 'device';
  return 'generic';
}

interface RuleSelectorSectionProps {
  activeSelector: string | null;
  selector: ResolvedSelector | null;
  selectedValue: string;
  onSelect: (value: string) => void;
}

export function RuleSelectorSection({ activeSelector, selector, selectedValue, onSelect }: RuleSelectorSectionProps) {
  const handleRadioChange = useCallback((value: string) => {
    onSelect(value);
  }, [onSelect]);

  if (!activeSelector) {
    return <p className="text-sm text-grouse mb-6">Click a word or phrase above to edit.</p>;
  }

  if (!selector) {
    return <p className="text-sm text-grouse mb-6">Click a word or phrase above to edit.</p>;
  }

  if (selector.options.length === 0) {
    return (
      <p className="text-sm text-grouse mb-6">
        There are no devices paired that meet the requirements for this rule.
      </p>
    );
  }

  if (getSelectorKind(selector) === 'device') {
    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-swift mb-3">Choose Device</h4>
        <ul className="space-y-1">
          {selector.options.map((opt, j) => {
            const isSelected = selectedValue === opt.value;
            return (
              <li key={j}>
                <label
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--border-radius-base)] cursor-pointer transition-colors ${
                    isSelected ? 'bg-peacock/10' : 'hover:bg-pigeon'
                  }`}
                >
                  <input
                    type="radio"
                    name={`selector-${activeSelector}`}
                    checked={isSelected}
                    onChange={() => handleRadioChange(opt.value)}
                    className="accent-peacock"
                  />
                  <span className="text-sm text-swift">{opt.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-swift mb-3">
        Choose <span className="capitalize">{selector.name}</span>
      </h4>
      <select
        value={selectedValue}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock text-sm text-swift bg-crane"
      >
        <option value="">Select an option...</option>
        {selector.options.map((opt, j) => (
          <option key={j} value={opt.value}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
