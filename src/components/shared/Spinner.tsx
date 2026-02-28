'use client';

/**
 * Spinner — numeric value spinner with increment/decrement.
 *
 * Replaces src/components/spinner/. Used for temperature controls,
 * time settings, and other numeric inputs.
 */

import { useCallback } from 'react';

interface SpinnerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  label?: string;
  disabled?: boolean;
  cycle?: boolean;
}

export function Spinner({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format,
  label,
  disabled = false,
  cycle = false,
}: SpinnerProps) {
  const increment = useCallback(() => {
    if (disabled) return;
    let next = value + step;
    if (next > max) next = cycle ? min : max;
    onChange(next);
  }, [value, step, max, min, cycle, disabled, onChange]);

  const decrement = useCallback(() => {
    if (disabled) return;
    let next = value - step;
    if (next < min) next = cycle ? max : min;
    onChange(next);
  }, [value, step, min, max, cycle, disabled, onChange]);

  const displayValue = format ? format(value) : String(value);

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-xs text-grouse">{label}</span>}
      <div className="flex items-center gap-2">
        <button
          onClick={decrement}
          disabled={disabled || (!cycle && value <= min)}
          className="w-8 h-8 rounded-full border border-heron flex items-center justify-center text-sm text-coot hover:bg-pigeon disabled:opacity-30"
          aria-label="Decrease"
        >
          &minus;
        </button>
        <span className="text-lg font-medium text-swift min-w-[3ch] text-center">
          {displayValue}
        </span>
        <button
          onClick={increment}
          disabled={disabled || (!cycle && value >= max)}
          className="w-8 h-8 rounded-full border border-heron flex items-center justify-center text-sm text-coot hover:bg-pigeon disabled:opacity-30"
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}
