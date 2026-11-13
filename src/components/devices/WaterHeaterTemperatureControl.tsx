'use client';

import { useCallback, useState } from 'react';
import { WaterHeater } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import {
  WATER_HEATER_MIN_F,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  getWaterHeaterMaxF,
  stepWaterHeaterSetpoint,
} from '@/lib/waterDevices';

/**
 * Water heater setpoint spinner (`changeWaterHeaterTemperature`). The
 * platform stores Celsius; the control shows and steps whole Fahrenheit
 * between 60° and the heater's max setpoint (capped at 65°C), skipping
 * 61°–79° like the legacy client.
 */
export function WaterHeaterTemperatureControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const setpointC = device?.[WaterHeater.ATTR_SETPOINT] as number | undefined;
  const currentF = typeof setpointC === 'number' ? celsiusToFahrenheit(setpointC) : null;
  const maxF = getWaterHeaterMaxF(device);

  const handleStep = useCallback(
    async (direction: 1 | -1) => {
      if (currentF == null) return;
      const nextF = stepWaterHeaterSetpoint(currentF, direction, maxF);
      if (nextF === currentF) return;
      setPending(true);
      try {
        await setAttribute(WaterHeater.ATTR_SETPOINT, fahrenheitToCelsius(nextF));
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to change the water heater temperature' }));
      } finally {
        setPending(false);
      }
    },
    [currentF, maxF, setAttribute, dispatch],
  );

  const handleDown = useCallback(() => handleStep(-1), [handleStep]);
  const handleUp = useCallback(() => handleStep(1), [handleStep]);

  if (currentF == null) {
    return <span data-testid={`water-heater-setpoint-${address}`} className="text-sm text-grouse">--</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleDown}
        disabled={pending || currentF <= WATER_HEATER_MIN_F}
        aria-label="Lower water heater temperature"
        data-testid={`water-heater-down-${address}`}
        className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron disabled:opacity-50"
      >
        -
      </button>
      <span data-testid={`water-heater-setpoint-${address}`} className="text-sm font-medium text-cardinal w-10 text-center">
        {currentF}&deg;
      </span>
      <button
        onClick={handleUp}
        disabled={pending || currentF >= maxF}
        aria-label="Raise water heater temperature"
        data-testid={`water-heater-up-${address}`}
        className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
