'use client';

/**
 * ThermostatSetpointStepper — +/- control for one schedule setpoint (°F).
 */

import { useCallback } from 'react';

interface ThermostatSetpointStepperProps {
  /** Stable id used in test ids, e.g. "heat" or "cool". */
  id: string;
  label: string;
  valueF: number;
  minF: number;
  maxF: number;
  color: 'cardinal' | 'peacock';
  onChange: (valueF: number) => void;
}

export function ThermostatSetpointStepper({
  id,
  label,
  valueF,
  minF,
  maxF,
  color,
  onChange,
}: ThermostatSetpointStepperProps) {
  const canDecrease = valueF > minF;
  const canIncrease = valueF < maxF;

  const handleDecrease = useCallback(() => {
    if (canDecrease) onChange(Math.min(maxF, valueF - 1));
  }, [canDecrease, maxF, valueF, onChange]);

  const handleIncrease = useCallback(() => {
    if (canIncrease) onChange(Math.max(minF, valueF + 1));
  }, [canIncrease, minF, valueF, onChange]);

  return (
    <div className="flex items-center justify-between bg-pigeon/50 rounded-[var(--border-radius-base)] px-4 py-3">
      <span className="text-sm font-medium text-swift">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid={`thermostat-schedule-${id}-down`}
          aria-label={`Decrease ${label}`}
          onClick={handleDecrease}
          disabled={!canDecrease}
          className="w-8 h-8 rounded-full bg-crane border border-heron text-swift flex items-center justify-center hover:bg-pigeon disabled:opacity-40 text-lg"
        >
          -
        </button>
        <span
          data-testid={`thermostat-schedule-${id}-value`}
          className={`text-xl font-medium w-12 text-center ${color === 'cardinal' ? 'text-cardinal' : 'text-peacock'}`}
        >
          {valueF}&deg;
        </span>
        <button
          type="button"
          data-testid={`thermostat-schedule-${id}-up`}
          aria-label={`Increase ${label}`}
          onClick={handleIncrease}
          disabled={!canIncrease}
          className="w-8 h-8 rounded-full bg-crane border border-heron text-swift flex items-center justify-center hover:bg-pigeon disabled:opacity-40 text-lg"
        >
          +
        </button>
      </div>
    </div>
  );
}
