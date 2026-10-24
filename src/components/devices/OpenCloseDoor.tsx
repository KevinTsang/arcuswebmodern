'use client';

import { useState, useCallback } from 'react';
import { MotorizedDoor } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function OpenCloseDoor({ address }: { address: string }) {
  const device = useDevice(address);
  const { sendCommand } = useDeviceActions(address);
  const [pending, setPending] = useState(false);

  const doorState = (device?.[MotorizedDoor.ATTR_DOORSTATE] as string) ?? MotorizedDoor.DOORSTATE_CLOSED;
  const isOpen = doorState !== MotorizedDoor.DOORSTATE_CLOSED;

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      if (isOpen) {
        await sendCommand(MotorizedDoor.CMD_CLOSEGARAGEDOOR, {});
      } else {
        await sendCommand(MotorizedDoor.CMD_OPENGARAGEDOOR, {});
      }
    } finally {
      setPending(false);
    }
  }, [isOpen, sendCommand]);

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      data-testid={`device-door-toggle-${address}`}
      className="px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane disabled:opacity-50"
    >
      {pending ? '...' : isOpen ? 'Close' : 'Open'}
    </button>
  );
}
