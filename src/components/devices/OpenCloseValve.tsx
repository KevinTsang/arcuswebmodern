'use client';

import { useState, useCallback } from 'react';
import { Valve } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { getValveStatus } from '@/lib/valveStatus';

const OBSTRUCTED_HINT = 'The valve reported an obstruction. Try Close again, or operate the valve manually.';

/**
 * Water shut-off valve control. Close stays available unless the valve is
 * settled CLOSED, so a leak shutoff can always be (re-)sent, even while the
 * valve is OPENING/CLOSING or reports OBSTRUCTION. Open is offered only from
 * CLOSED, so a tap can never reverse a shutoff in progress.
 */
export default function OpenCloseValve({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);
  const { state, label: stateLabel, target } = getValveStatus(device);
  const obstructed = state === Valve.VALVESTATE_OBSTRUCTION;
  const settled = state === Valve.VALVESTATE_OPEN || state === Valve.VALVESTATE_CLOSED;
  const hintId = `device-valve-hint-${address}`;

  const handleToggle = useCallback(async () => {
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
  else label = stateLabel;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {!settled && target !== null && (
          <span
            data-testid={`device-valve-state-${address}`}
            className={`text-xs font-medium ${obstructed ? 'text-cardinal' : 'text-grouse'}`}
          >
            {stateLabel}
          </span>
        )}
        <button
          onClick={handleToggle}
          disabled={pending || target === null}
          aria-describedby={obstructed ? hintId : undefined}
          data-testid={`device-valve-toggle-${address}`}
          className="px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane disabled:opacity-50"
        >
          {label}
        </button>
      </div>
      {obstructed && (
        <p id={hintId} data-testid={hintId} className="max-w-48 text-right text-xs text-cardinal">
          {OBSTRUCTED_HINT}
        </p>
      )}
    </div>
  );
}
