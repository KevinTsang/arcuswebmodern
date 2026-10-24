'use client';

import { useState, useCallback } from 'react';
import { DoorLock } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { getLockStatus } from '@/lib/lockStatus';

const JAMMED_HINT = 'The lock may be jammed. Check the door, then try again.';

/**
 * Door lock control. Lock stays available unless the lock reports LOCKED, so
 * a lock that is LOCKING/UNLOCKING, jammed or unknown can always be secured
 * remotely. Unlock is offered only from LOCKED, so neither a tap nor a stale
 * WARN_JAM can reverse a lock in progress.
 */
export default function LockUnlock({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);
  const { state, jammed, label: stateLabel, target } = getLockStatus(device);
  const settled = !jammed && (state === DoorLock.LOCKSTATE_LOCKED || state === DoorLock.LOCKSTATE_UNLOCKED);
  const hintId = `device-lock-hint-${address}`;

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      await setAttribute(DoorLock.ATTR_LOCKSTATE, target);
    } catch {
      const verb = target === DoorLock.LOCKSTATE_LOCKED ? 'lock' : 'unlock';
      dispatch(addNotification({ type: 'error', message: `Failed to ${verb} the door` }));
    } finally {
      setPending(false);
    }
  }, [target, setAttribute, dispatch]);

  let label: string;
  if (pending) label = '...';
  else if (target === DoorLock.LOCKSTATE_UNLOCKED) label = 'Unlock';
  else if (target === DoorLock.LOCKSTATE_LOCKED) label = 'Lock';
  else label = stateLabel;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {!settled && target !== null && (
          <span
            data-testid={`device-lock-state-${address}`}
            className={`text-xs font-medium ${jammed ? 'text-cardinal' : 'text-grouse'}`}
          >
            {stateLabel}
          </span>
        )}
        <button
          onClick={handleToggle}
          disabled={pending || target === null}
          aria-describedby={jammed ? hintId : undefined}
          data-testid={`device-lock-toggle-${address}`}
          className={`
            px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium transition-colors
            ${target === DoorLock.LOCKSTATE_UNLOCKED ? 'bg-peacock text-crane' : 'bg-cardinal/10 text-cardinal border border-cardinal/30'}
            disabled:opacity-50
          `}
        >
          {label}
        </button>
      </div>
      {jammed && (
        <p id={hintId} data-testid={hintId} className="max-w-48 text-right text-xs text-cardinal">
          {JAMMED_HINT}
        </p>
      )}
    </div>
  );
}
