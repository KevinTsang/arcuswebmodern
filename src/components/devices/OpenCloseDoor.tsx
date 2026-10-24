'use client';

import { useState, useCallback } from 'react';
import { MotorizedDoor, DeviceAdvanced } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

/**
 * devadv:errors key the garage door drivers set when the door is obstructed.
 * While it is present the drivers ignore door state changes until the door
 * is operated manually and reports OPEN or CLOSED again.
 */
const ERR_OBSTRUCTION = 'ERR_OBSTRUCTION';

const STATE_LABELS: Record<string, string> = {
  [MotorizedDoor.DOORSTATE_OPENING]: 'Opening',
  [MotorizedDoor.DOORSTATE_CLOSING]: 'Closing',
};

/**
 * Garage door control. The platform has no open/close methods on
 * motdoor; the door is driven by writing motdoor:doorstate, and the drivers
 * only accept OPEN or CLOSED as the desired state.
 */
export default function OpenCloseDoor({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const doorState = device?.[MotorizedDoor.ATTR_DOORSTATE] as string | undefined;
  const errors = device?.[DeviceAdvanced.ATTR_ERRORS] as Record<string, string> | undefined;
  const obstructed = doorState === MotorizedDoor.DOORSTATE_OBSTRUCTION || !!errors?.[ERR_OBSTRUCTION];

  let target: string | null = null;
  if (!obstructed && doorState === MotorizedDoor.DOORSTATE_CLOSED) target = MotorizedDoor.DOORSTATE_OPEN;
  if (!obstructed && doorState === MotorizedDoor.DOORSTATE_OPEN) target = MotorizedDoor.DOORSTATE_CLOSED;

  const handleToggle = useCallback(async () => {
    if (!target) return;
    setPending(true);
    try {
      await setAttribute(MotorizedDoor.ATTR_DOORSTATE, target);
    } catch {
      const verb = target === MotorizedDoor.DOORSTATE_OPEN ? 'open' : 'close';
      dispatch(addNotification({ type: 'error', message: `Failed to ${verb} the garage door` }));
    } finally {
      setPending(false);
    }
  }, [target, setAttribute, dispatch]);

  let label: string;
  if (pending) label = '...';
  else if (obstructed) label = 'Obstructed';
  else if (target === MotorizedDoor.DOORSTATE_OPEN) label = 'Open';
  else if (target === MotorizedDoor.DOORSTATE_CLOSED) label = 'Close';
  else label = STATE_LABELS[doorState ?? ''] ?? 'Unknown';

  return (
    <button
      onClick={handleToggle}
      disabled={pending || !target}
      title={obstructed ? 'Obstruction detected. Clear it and operate the door manually to restore control.' : undefined}
      data-testid={`device-door-toggle-${address}`}
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
