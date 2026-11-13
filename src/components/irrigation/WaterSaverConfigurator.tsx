'use client';

import { useCallback, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, IrrigationController } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP } from '@/lib/irrigation';

interface WaterSaverConfiguratorProps {
  address: string;
}

const STEP_BUTTON =
  'w-8 h-8 flex items-center justify-center text-lg bg-pigeon text-coot hover:bg-heron rounded-[var(--border-radius-base)] disabled:opacity-50';

/**
 * Water saver / seasonal adjustment: scales every scheduled watering duration
 * by a percentage (`irrcont:budget`). Replaces legacy
 * `device/configurators/water-saver.component`.
 */
export function WaterSaverConfigurator({ address }: WaterSaverConfiguratorProps) {
  const device = useDevice(address);
  const dispatch = useAppDispatch();
  const budget = (device?.[IrrigationController.ATTR_BUDGET] as number | undefined) ?? 100;
  // Optimistic value shown while a write is in flight; null once settled.
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const value = pendingValue ?? budget;

  const save = useCallback(async (next: number) => {
    setPendingValue(next);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, { [IrrigationController.ATTR_BUDGET]: next });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update water saver' }));
    } finally {
      setPendingValue(null);
    }
  }, [address, dispatch]);

  const handleDecrease = useCallback(() => {
    save(Math.max(BUDGET_MIN, value - BUDGET_STEP));
  }, [save, value]);

  const handleIncrease = useCallback(() => {
    save(Math.min(BUDGET_MAX, value + BUDGET_STEP));
  }, [save, value]);

  return (
    <div data-testid="water-saver">
      <p className="text-sm font-medium text-swift">Water Saver</p>
      <p className="text-xs text-grouse mt-1 mb-3">
        Save water by scaling the watering time of the entire schedule. Use it as a seasonal
        adjustment: if every event waters for 10 minutes in summer, setting 50% in the fall
        waters for 5 minutes instead.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Decrease water saver"
          data-testid="water-saver-decrease"
          onClick={handleDecrease}
          disabled={pendingValue !== null || value <= BUDGET_MIN}
          className={STEP_BUTTON}
        >
          −
        </button>
        <span data-testid="water-saver-value" className="w-14 text-center text-lg text-swift">{value}%</span>
        <button
          type="button"
          aria-label="Increase water saver"
          data-testid="water-saver-increase"
          onClick={handleIncrease}
          disabled={pendingValue !== null || value >= BUDGET_MAX}
          className={STEP_BUTTON}
        >
          +
        </button>
      </div>
    </div>
  );
}
