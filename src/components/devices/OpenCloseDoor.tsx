'use client';

import { useState, useCallback, useEffect } from 'react';
import { MotorizedDoor } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { getGarageDoorStatus } from '@/lib/garageDoorStatus';

/**
 * How long the control waits for the door to report a new doorstate after a
 * write. The platform acks the write right away, but Z-Wave controllers flash
 * and beep for several seconds before the door moves, and GoControl/Linear
 * only report OPENING/CLOSING once it does.
 */
export const DOOR_COMMAND_TIMEOUT_MS = 30_000;

const BLOCKED_HINT = 'Clear the obstruction, then operate the door manually to restore remote control.';
const OBSTRUCTED_HINT = 'Obstruction detected. Make sure the doorway is clear before closing.';

/**
 * Garage door control. The platform has no open/close methods on motdoor;
 * the door is driven by writing motdoor:doorstate OPEN or CLOSED. Close stays
 * available unless the door is settled CLOSED, so a lost final report never
 * leaves it uncontrollable; the only lockout is the drivers' own, while
 * devadv:errors has ERR_OBSTRUCTION.
 */
export default function OpenCloseDoor({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const hintId = `device-door-hint-${address}`;
  const { state, obstructed, label: stateLabel, target } = getGarageDoorStatus(device);

  // Set when a write is sent; cleared once the door reports a different
  // doorstate, the write fails, or DOOR_COMMAND_TIMEOUT_MS passes.
  const [awaiting, setAwaiting] = useState(false);
  const [sentFromState, setSentFromState] = useState(state);
  if (state !== sentFromState) {
    setSentFromState(state);
    setAwaiting(false);
  }

  useEffect(() => {
    if (!awaiting) return;
    const timer = setTimeout(() => setAwaiting(false), DOOR_COMMAND_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [awaiting]);

  const handleToggle = useCallback(async () => {
    setAwaiting(true);
    try {
      await setAttribute(MotorizedDoor.ATTR_DOORSTATE, target);
    } catch {
      setAwaiting(false);
      const verb = target === MotorizedDoor.DOORSTATE_OPEN ? 'open' : 'close';
      dispatch(addNotification({ type: 'error', message: `Failed to ${verb} the garage door` }));
    }
  }, [target, setAttribute, dispatch]);

  const blocked = obstructed && target === null;
  const settled = !obstructed && (state === MotorizedDoor.DOORSTATE_OPEN || state === MotorizedDoor.DOORSTATE_CLOSED);

  let label: string;
  if (awaiting) label = '...';
  else if (target === MotorizedDoor.DOORSTATE_OPEN) label = 'Open';
  else if (target === MotorizedDoor.DOORSTATE_CLOSED) label = 'Close';
  else label = stateLabel;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {!settled && target !== null && (
          <span
            data-testid={`device-door-state-${address}`}
            className={`text-xs font-medium ${obstructed ? 'text-cardinal' : 'text-grouse'}`}
          >
            {stateLabel}
          </span>
        )}
        <button
          onClick={handleToggle}
          disabled={awaiting || target === null}
          aria-describedby={obstructed ? hintId : undefined}
          data-testid={`device-door-toggle-${address}`}
          className={`
            px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium
            ${blocked ? 'bg-cardinal/10 text-cardinal border border-cardinal/30 cursor-not-allowed' : 'bg-peacock text-crane disabled:opacity-50'}
          `}
        >
          {label}
        </button>
      </div>
      {obstructed && (
        <p id={hintId} data-testid={hintId} className="max-w-48 text-right text-xs text-cardinal">
          {blocked ? BLOCKED_HINT : OBSTRUCTED_HINT}
        </p>
      )}
    </div>
  );
}
