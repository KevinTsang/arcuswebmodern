'use client';

import { useCallback, useState, type ChangeEvent } from 'react';
import Bridge from '@arcus/core/bridge';
import { LawnNGardenSubsystem } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { INTERVAL_DAYS } from '@/lib/irrigation';

interface IrrigationIntervalSelectProps {
  address: string;
  subsystemAddress: string | undefined;
  days: number;
}

/**
 * Interval mode: how many days between waterings. Changing it restarts the
 * interval from today (`sublawnngarden:ConfigureIntervalSchedule`).
 */
export function IrrigationIntervalSelect({ address, subsystemAddress, days }: IrrigationIntervalSelectProps) {
  const dispatch = useAppDispatch();
  const [pendingDays, setPendingDays] = useState<number | null>(null);

  const handleChange = useCallback(async (e: ChangeEvent<HTMLSelectElement>) => {
    if (!subsystemAddress) return;
    const next = Number(e.target.value);
    setPendingDays(next);
    try {
      await Bridge.request(LawnNGardenSubsystem.CMD_CONFIGUREINTERVALSCHEDULE, subsystemAddress, {
        controller: address,
        startTime: Date.now(),
        days: next,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update watering interval' }));
    } finally {
      setPendingDays(null);
    }
  }, [subsystemAddress, address, dispatch]);

  return (
    <label className="block">
      <span className="text-sm font-medium text-swift">Water Every</span>
      <select
        data-testid="irrigation-interval-days"
        value={pendingDays ?? days}
        onChange={handleChange}
        disabled={pendingDays !== null || !subsystemAddress}
        className="mt-1 w-full border border-heron rounded-[var(--border-radius-base)] bg-crane px-3 py-2 text-sm text-swift"
      >
        {INTERVAL_DAYS.map((d) => (
          <option key={d} value={d}>{d} {d === 1 ? 'Day' : 'Days'}</option>
        ))}
      </select>
    </label>
  );
}
