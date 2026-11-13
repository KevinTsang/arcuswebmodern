'use client';

import { useState, useCallback } from 'react';
import { PetDoor } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { getPetDoorLockLabel } from '@/lib/petDoor';

const MODES = [
  { value: PetDoor.LOCKSTATE_LOCKED, label: 'Lock' },
  { value: PetDoor.LOCKSTATE_UNLOCKED, label: 'Unlock' },
  { value: PetDoor.LOCKSTATE_AUTO, label: 'Auto' },
];

/**
 * Pet door mode control. Locked keeps every pet in or out, Unlocked lets any
 * pet through, and Auto only opens for the door's paired smart keys. The
 * door is driven by writing petdoor:lockstate.
 */
export default function PetDoorLockControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState<string | null>(null);
  const lockState = device?.[PetDoor.ATTR_LOCKSTATE] as string | undefined;

  const handleSelect = useCallback(async (mode: string) => {
    setPending(mode);
    try {
      await setAttribute(PetDoor.ATTR_LOCKSTATE, mode);
    } catch {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to set the pet door to ${getPetDoorLockLabel(mode)}`,
      }));
    }
    setPending(null);
  }, [setAttribute, dispatch]);

  return (
    <div role="group" aria-label="Pet door mode" className="flex gap-1">
      {MODES.map((m) => {
        const active = lockState === m.value;
        return (
          <button
            key={m.value}
            onClick={() => handleSelect(m.value)}
            disabled={pending !== null || active}
            aria-pressed={active}
            data-testid={`petdoor-mode-${m.value.toLowerCase()}-${address}`}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-[var(--border-radius-base)] transition-colors
              ${active ? 'bg-peacock text-crane' : 'bg-pigeon text-coot hover:bg-heron disabled:opacity-50'}
            `}
          >
            {pending === m.value ? '...' : m.label}
          </button>
        );
      })}
    </div>
  );
}
