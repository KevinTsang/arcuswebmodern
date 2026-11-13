'use client';

import { useCallback, useState } from 'react';
import { SpaceHeater, TwinStar } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { celsiusToFahrenheit, fahrenheitToCelsius } from '@/lib/thermostat';

/** Fallback range used by the legacy client when the heater reports none. */
export const SPACE_HEATER_MIN_F = 51;
export const SPACE_HEATER_MAX_F = 96;

const BUTTON_CLASS = 'w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron disabled:opacity-40 disabled:cursor-not-allowed';

/**
 * Space heater setpoint stepper. The setpoint can only be changed while the
 * heater is on and (for TwinStar heaters) not in eco mode.
 */
export default function SpaceHeaterControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);

  const heatState = device?.[SpaceHeater.ATTR_HEATSTATE] as string | undefined;
  const ecoMode = device?.[TwinStar.ATTR_ECOMODE] as string | undefined;
  const setpointC = device?.[SpaceHeater.ATTR_SETPOINT] as number | undefined;
  const minC = device?.[SpaceHeater.ATTR_MINSETPOINT] as number | undefined;
  const maxC = device?.[SpaceHeater.ATTR_MAXSETPOINT] as number | undefined;
  const setpointF = setpointC != null ? celsiusToFahrenheit(setpointC) : undefined;
  const minF = minC != null ? celsiusToFahrenheit(minC) : SPACE_HEATER_MIN_F;
  const maxF = maxC != null ? celsiusToFahrenheit(maxC) : SPACE_HEATER_MAX_F;

  const handleChange = useCallback(
    async (delta: number) => {
      if (setpointF == null) return;
      const target = Math.min(maxF, Math.max(minF, setpointF + delta));
      if (target === setpointF) return;
      setSaving(true);
      try {
        await setAttribute(SpaceHeater.ATTR_SETPOINT, fahrenheitToCelsius(target));
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to change heater temperature' }));
      } finally {
        setSaving(false);
      }
    },
    [setpointF, minF, maxF, setAttribute, dispatch],
  );

  if (heatState !== SpaceHeater.HEATSTATE_ON) {
    return <span data-testid={`spaceheater-off-${address}`} className="text-sm text-grouse">Off</span>;
  }

  if (ecoMode === TwinStar.ECOMODE_ENABLED) {
    return <span data-testid={`spaceheater-eco-${address}`} className="text-sm text-grouse">Eco Mode</span>;
  }

  if (setpointF == null) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleChange(-1)}
        disabled={saving || setpointF <= minF}
        aria-label="Lower heater setpoint"
        data-testid={`spaceheater-down-${address}`}
        className={BUTTON_CLASS}
      >
        -
      </button>
      <span data-testid={`spaceheater-value-${address}`} className="text-sm font-medium text-cardinal w-10 text-center">
        {setpointF}&deg;
      </span>
      <button
        onClick={() => handleChange(1)}
        disabled={saving || setpointF >= maxF}
        aria-label="Raise heater setpoint"
        data-testid={`spaceheater-up-${address}`}
        className={BUTTON_CLASS}
      >
        +
      </button>
    </div>
  );
}
