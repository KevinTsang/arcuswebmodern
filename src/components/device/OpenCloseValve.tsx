'use client';

import { useState, useCallback } from 'react';
import { Valve } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function OpenCloseValve({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const [pending, setPending] = useState(false);

  const open = (device?.[Valve.ATTR_VALVESTATE] as string) === Valve.VALVESTATE_OPEN;

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      await setAttribute(Valve.ATTR_VALVESTATE, open ? Valve.VALVESTATE_CLOSED : Valve.VALVESTATE_OPEN);
    } finally {
      setPending(false);
    }
  }, [open, setAttribute]);

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className="px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane disabled:opacity-50"
    >
      {pending ? '...' : open ? 'Close' : 'Open'}
    </button>
  );
}
