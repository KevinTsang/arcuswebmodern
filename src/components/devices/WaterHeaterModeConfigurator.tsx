'use client';

import { useCallback, useState } from 'react';
import { AOSmithWaterHeaterController } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

interface ModeOption {
  value: string;
  label: string;
}

const MODES: ModeOption[] = [
  { value: AOSmithWaterHeaterController.CONTROLMODE_STANDARD, label: 'Standard' },
  { value: AOSmithWaterHeaterController.CONTROLMODE_ENERGY_SMART, label: 'EnergySmart®' },
];

/**
 * AO Smith water heater control mode (`water-heater-mode`). Vacation mode
 * is set at the heater itself, so it is shown but not offered.
 */
export function WaterHeaterModeConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const mode = device?.[AOSmithWaterHeaterController.ATTR_CONTROLMODE] as string | undefined;

  const handleSelect = useCallback(
    async (value: string) => {
      if (value === mode) return;
      setPending(true);
      try {
        await setAttribute(AOSmithWaterHeaterController.ATTR_CONTROLMODE, value);
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to change the water heater mode' }));
      } finally {
        setPending(false);
      }
    },
    [mode, setAttribute, dispatch],
  );

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">Water Heater Mode</p>
      <p className="text-xs text-grouse mb-3">
        EnergySmart&reg; mode is provided by your water heater manufacturer and saves energy by monitoring
        usage and adjusting the set point to match the water draw usage.
      </p>
      <div className="flex gap-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => handleSelect(m.value)}
            disabled={pending}
            aria-pressed={mode === m.value}
            data-testid={`water-heater-mode-${m.value.toLowerCase()}`}
            className={`
              px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors disabled:opacity-50
              ${mode === m.value ? 'bg-peacock text-crane' : 'bg-pigeon text-coot hover:bg-heron'}
            `}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === AOSmithWaterHeaterController.CONTROLMODE_VACATION && (
        <p data-testid="water-heater-mode-vacation-note" className="text-xs text-grouse mt-2">
          The water heater is in Vacation mode. Choose a mode above to resume normal heating.
        </p>
      )}
    </div>
  );
}
