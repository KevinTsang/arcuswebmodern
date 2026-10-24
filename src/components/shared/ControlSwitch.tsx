'use client';

/**
 * ControlSwitch — styled toggle switch.
 *
 * Replaces src/components/control-switch/.
 */

interface ControlSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  /** Optional `data-testid` for the switch button. */
  testId?: string;
}

export function ControlSwitch({ checked, onChange, label, disabled = false, testId }: ControlSwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <button
        role="switch"
        aria-checked={checked}
        data-testid={testId}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-peacock' : 'bg-pigeon'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-crane rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label && <span className="control-switch-label text-sm text-coot">{label}</span>}
    </label>
  );
}
