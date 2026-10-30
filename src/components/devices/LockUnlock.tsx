'use client';

import { useState, useCallback } from 'react';
import { DoorLock } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { getLockStatus, type LockTarget } from '@/lib/lockStatus';

const JAMMED_HINT = 'The lock may be jammed. Check the door, then try again.';
const PENDING_LABEL = '...';
const BUTTON_CLASS = 'py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium transition-colors disabled:opacity-50';
const JAMMED_BUTTON_CLASS = `${BUTTON_CLASS} px-3 bg-cardinal/10 text-cardinal border border-cardinal/30`;

/**
 * Door lock control.
 *
 * Without a jam it is one toggle. Unlock is offered only from LOCKED; every
 * other state (UNLOCKED, LOCKING, UNLOCKING, unknown) offers Lock, so a tap
 * never reverses a lock in progress and a stuck lock can always be secured.
 *
 * While devadv:errors has WARN_JAM it shows "Jammed" and both Lock and Unlock,
 * whatever lockstate reports: the drivers leave lockstate where the bolt
 * stalled, so the user has to be able to retry either way. (Legacy offered
 * only Unlock here, so a jammed lock reporting UNLOCKED could not be locked.)
 *
 * Every button is disabled while a request from this control is in flight.
 */
export default function LockUnlock({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pendingTarget, setPendingTarget] = useState<LockTarget | null>(null);
  const pending = pendingTarget !== null;
  const { state, jammed, label: stateLabel, target } = getLockStatus(device);
  const settled = !jammed && (state === DoorLock.LOCKSTATE_LOCKED || state === DoorLock.LOCKSTATE_UNLOCKED);
  const hintId = `device-lock-hint-${address}`;

  const send = useCallback(async (value: LockTarget) => {
    setPendingTarget(value);
    try {
      await setAttribute(DoorLock.ATTR_LOCKSTATE, value);
    } catch {
      const verb = value === DoorLock.LOCKSTATE_LOCKED ? 'lock' : 'unlock';
      dispatch(addNotification({ type: 'error', message: `Failed to ${verb} the door` }));
    } finally {
      setPendingTarget(null);
    }
  }, [setAttribute, dispatch]);

  const handleToggle = useCallback(() => {
    if (target) void send(target);
  }, [target, send]);

  const handleLock = useCallback(() => {
    void send(DoorLock.LOCKSTATE_LOCKED);
  }, [send]);

  const handleUnlock = useCallback(() => {
    void send(DoorLock.LOCKSTATE_UNLOCKED);
  }, [send]);

  let label: string;
  if (pending) label = PENDING_LABEL;
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
        {jammed ? (
          <>
            <button
              onClick={handleLock}
              disabled={pending}
              aria-label="Lock"
              aria-describedby={hintId}
              data-testid={`device-lock-lock-${address}`}
              className={JAMMED_BUTTON_CLASS}
            >
              {pendingTarget === DoorLock.LOCKSTATE_LOCKED ? PENDING_LABEL : 'Lock'}
            </button>
            <button
              onClick={handleUnlock}
              disabled={pending}
              aria-label="Unlock"
              aria-describedby={hintId}
              data-testid={`device-lock-unlock-${address}`}
              className={JAMMED_BUTTON_CLASS}
            >
              {pendingTarget === DoorLock.LOCKSTATE_UNLOCKED ? PENDING_LABEL : 'Unlock'}
            </button>
          </>
        ) : (
          <button
            onClick={handleToggle}
            disabled={pending || target === null}
            data-testid={`device-lock-toggle-${address}`}
            className={`${BUTTON_CLASS} px-4 ${target === DoorLock.LOCKSTATE_UNLOCKED ? 'bg-peacock text-crane' : 'bg-cardinal/10 text-cardinal border border-cardinal/30'}`}
          >
            {label}
          </button>
        )}
      </div>
      {jammed && (
        <p id={hintId} data-testid={hintId} className="max-w-48 text-right text-xs text-cardinal">
          {JAMMED_HINT}
        </p>
      )}
    </div>
  );
}
