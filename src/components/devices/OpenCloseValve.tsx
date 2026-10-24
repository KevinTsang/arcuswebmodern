'use client';

import { useState, useCallback } from 'react';
import { Valve } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

const STATE_LABELS: Record<string, string> = {
  [Valve.VALVESTATE_OPENING]: 'Opening',
  [Valve.VALVESTATE_CLOSING]: 'Closing',
  [Valve.VALVESTATE_OBSTRUCTION]: 'Obstructed',
};

/**
 * Water shut-off valve control. Only a settled OPEN or CLOSED valve can be
 * toggled; while it is OPENING/CLOSING (e.g. a leak-triggered shutoff in
 * progress) or OBSTRUCTION the control is disabled.
 */
export default function OpenCloseValve({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const valveState = device?.[Valve.ATTR_VALVESTATE] as string | undefined;
  const obstructed = valveState === Valve.VALVESTATE_OBSTRUCTION;

  let target: string | null = null;
  if (valveState === Valve.VALVESTATE_CLOSED) target = Valve.VALVESTATE_OPEN;
  if (valveState === Valve.VALVESTATE_OPEN) target = Valve.VALVESTATE_CLOSED;

  const handleToggle = useCallback(async () => {
    if (!target) return;
    setPending(true);
    try {
      await setAttribute(Valve.ATTR_VALVESTATE, target);
    } catch {
      const verb = target === Valve.VALVESTATE_OPEN ? 'open' : 'close';
      dispatch(addNotification({ type: 'error', message: `Failed to ${verb} the valve` }));
    } finally {
      setPending(false);
    }
  }, [target, setAttribute, dispatch]);

  let label: string;
  if (pending) label = '...';
  else if (target === Valve.VALVESTATE_OPEN) label = 'Open';
  else if (target === Valve.VALVESTATE_CLOSED) label = 'Close';
  else label = STATE_LABELS[valveState ?? ''] ?? 'Unknown';

  return (
    <button
      onClick={handleToggle}
      disabled={pending || !target}
      title={obstructed ? 'Obstruction detected. Open and close the valve manually to resolve.' : undefined}
      data-testid={`device-valve-toggle-${address}`}
      className={`
        px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium
        ${obstructed ? 'bg-cardinal/10 text-cardinal border border-cardinal/30' : 'bg-peacock text-crane'}
        disabled:opacity-50
      `}
    >
      {label}
    </button>
  );
}
