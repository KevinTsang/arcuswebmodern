'use client';

import { useState, useCallback } from 'react';
import { DoorLock, DeviceAdvanced } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

/**
 * devadv:errors key the door lock drivers set when a lock jams or a
 * lock/unlock does not complete. The lockstate can be left at
 * LOCKING/UNLOCKING, so a jammed lock stays operable and offers Unlock
 * (matching the legacy web and iOS clients).
 */
const WARN_JAM = 'WARN_JAM';

const STATE_LABELS: Record<string, string> = {
  [DoorLock.LOCKSTATE_LOCKING]: 'Locking',
  [DoorLock.LOCKSTATE_UNLOCKING]: 'Unlocking',
};

export default function LockUnlock({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const lockState = device?.[DoorLock.ATTR_LOCKSTATE] as string | undefined;
  const errors = device?.[DeviceAdvanced.ATTR_ERRORS] as Record<string, string> | undefined;
  const jammed = !!errors?.[WARN_JAM];

  let target: string | null = null;
  if (jammed || lockState === DoorLock.LOCKSTATE_LOCKED) target = DoorLock.LOCKSTATE_UNLOCKED;
  else if (lockState === DoorLock.LOCKSTATE_UNLOCKED) target = DoorLock.LOCKSTATE_LOCKED;

  const handleToggle = useCallback(async () => {
    if (!target) return;
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
  else label = STATE_LABELS[lockState ?? ''] ?? 'Unknown';

  const showLockedStyle = !jammed && (lockState === DoorLock.LOCKSTATE_LOCKED || lockState === DoorLock.LOCKSTATE_LOCKING);

  return (
    <div className="flex items-center gap-2">
      {jammed && (
        <span
          data-testid={`device-lock-jammed-${address}`}
          title={errors?.[WARN_JAM]}
          className="text-xs font-medium text-cardinal"
        >
          Jammed
        </span>
      )}
      <button
        onClick={handleToggle}
        disabled={pending || !target}
        data-testid={`device-lock-toggle-${address}`}
        className={`
          px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium transition-colors
          ${showLockedStyle ? 'bg-peacock text-crane' : 'bg-cardinal/10 text-cardinal border border-cardinal/30'}
          disabled:opacity-50
        `}
      >
        {label}
      </button>
    </div>
  );
}
