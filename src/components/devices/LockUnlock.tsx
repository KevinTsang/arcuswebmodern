'use client';

import { useState, useCallback } from 'react';
import { DoorLock } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function LockUnlock({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const [pending, setPending] = useState(false);

  const locked = (device?.[DoorLock.ATTR_LOCKSTATE] as string) === DoorLock.LOCKSTATE_LOCKED;

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      await setAttribute(DoorLock.ATTR_LOCKSTATE, locked ? DoorLock.LOCKSTATE_UNLOCKED : DoorLock.LOCKSTATE_LOCKED);
    } finally {
      setPending(false);
    }
  }, [locked, setAttribute]);

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`
        px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium transition-colors
        ${locked ? 'bg-peacock text-crane' : 'bg-cardinal/10 text-cardinal border border-cardinal/30'}
        disabled:opacity-50
      `}
    >
      {pending ? '...' : locked ? 'Unlock' : 'Lock'}
    </button>
  );
}
