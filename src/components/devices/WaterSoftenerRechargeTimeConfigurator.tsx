'use client';

import { useCallback, useState, type ChangeEvent } from 'react';
import { WaterSoftener } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { formatHour } from '@/lib/waterDevices';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Water softener recharge start hour (`water-softener-recharge-time`).
 * The platform stores the hour of day (0–23) in
 * `watersoftener:rechargeStartTime`.
 */
export function WaterSoftenerRechargeTimeConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const hour = device?.[WaterSoftener.ATTR_RECHARGESTARTTIME] as number | undefined;

  const handleChange = useCallback(
    async (e: ChangeEvent<HTMLSelectElement>) => {
      const next = Number(e.target.value);
      setPending(true);
      try {
        await setAttribute(WaterSoftener.ATTR_RECHARGESTARTTIME, next);
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to update the recharge time' }));
      } finally {
        setPending(false);
      }
    },
    [setAttribute, dispatch],
  );

  return (
    <div>
      <label htmlFor={`recharge-time-${address}`} className="block text-sm font-medium text-swift mb-2">
        Recharge Time
      </label>
      <p className="text-xs text-grouse mb-3">
        The softener only recharges when it needs to, which restores its capacity to produce soft water.
        Pick a time when you&apos;re not likely to be using water.
      </p>
      <select
        id={`recharge-time-${address}`}
        data-testid="water-softener-recharge-time"
        value={typeof hour === 'number' ? String(hour) : ''}
        onChange={handleChange}
        disabled={pending}
        className="px-3 py-1.5 text-sm bg-crane border border-heron rounded-[var(--border-radius-base)] text-swift disabled:opacity-50"
      >
        {typeof hour !== 'number' && <option value="" disabled>Choose a time</option>}
        {HOURS.map((h) => (
          <option key={h} value={String(h)}>{formatHour(h)}</option>
        ))}
      </select>
    </div>
  );
}
