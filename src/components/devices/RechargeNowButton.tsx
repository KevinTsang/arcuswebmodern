'use client';

import { useCallback, useState } from 'react';
import { WaterSoftener } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

/**
 * Water softener "Recharge Now" action (`recharge-now`). Sends
 * `watersoftener:rechargeNow`; disabled while a recharge is running.
 */
export function RechargeNowButton({ address }: { address: string }) {
  const device = useDevice(address);
  const { sendCommand } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const recharging = device?.[WaterSoftener.ATTR_RECHARGESTATUS] === WaterSoftener.RECHARGESTATUS_RECHARGING;

  const handleRecharge = useCallback(async () => {
    setPending(true);
    try {
      await sendCommand(WaterSoftener.CMD_RECHARGENOW);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to start the water softener recharge' }));
    } finally {
      setPending(false);
    }
  }, [sendCommand, dispatch]);

  let label = 'Recharge Now';
  if (recharging) label = 'Recharging';
  else if (pending) label = '...';

  return (
    <button
      onClick={handleRecharge}
      disabled={pending || recharging}
      data-testid={`water-softener-recharge-${address}`}
      className="px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane disabled:opacity-50"
    >
      {label}
    </button>
  );
}
