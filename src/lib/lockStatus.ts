/**
 * One reading of a door lock's state, shared by the device status line
 * (getDeviceStatusText) and the LockUnlock control so they always agree.
 */

import { DeviceAdvanced, DoorLock } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

/**
 * devadv:errors key the door lock drivers set when a lock/unlock does not
 * complete. The drivers leave lockstate where it was (often LOCKING or
 * UNLOCKING) and only clear the key once the lock reports LOCKED or UNLOCKED,
 * so it can still be set while a retry is in progress.
 */
export const WARN_JAM = 'WARN_JAM';

/** doorlock:lockstate values the platform defines. */
export type LockState =
  | typeof DoorLock.LOCKSTATE_LOCKED
  | typeof DoorLock.LOCKSTATE_UNLOCKED
  | typeof DoorLock.LOCKSTATE_LOCKING
  | typeof DoorLock.LOCKSTATE_UNLOCKING;

/** doorlock:lockstate values the drivers accept as a write. */
export type LockTarget = typeof DoorLock.LOCKSTATE_LOCKED | typeof DoorLock.LOCKSTATE_UNLOCKED;

export interface LockStatus {
  /** Reported lockstate, or null when it is missing or not a known value. */
  state: LockState | null;
  /** devadv:errors has WARN_JAM. */
  jammed: boolean;
  /** Locked, Unlocked, Locking, Unlocking, Jammed or Unknown. */
  label: string;
  /**
   * lockstate the single toggle writes, or null without a device. Lock is
   * offered in every state except LOCKED (LOCKING, UNLOCKING, UNLOCKED and
   * unknown; the drivers send the command in every state), so a stuck lock
   * can always be locked remotely and a tap never reverses a lock in progress.
   * A jammed lock shows both Lock and Unlock instead (see LockUnlock), so
   * this is not used while jammed.
   */
  target: LockTarget | null;
}

const STATE_LABELS: Record<LockState, string> = {
  [DoorLock.LOCKSTATE_LOCKED]: 'Locked',
  [DoorLock.LOCKSTATE_UNLOCKED]: 'Unlocked',
  [DoorLock.LOCKSTATE_LOCKING]: 'Locking',
  [DoorLock.LOCKSTATE_UNLOCKING]: 'Unlocking',
};

function readLockState(value: unknown): LockState | null {
  switch (value) {
    case DoorLock.LOCKSTATE_LOCKED:
    case DoorLock.LOCKSTATE_UNLOCKED:
    case DoorLock.LOCKSTATE_LOCKING:
    case DoorLock.LOCKSTATE_UNLOCKING:
      return value;
    default:
      return null;
  }
}

export function getLockStatus(device: DeviceEntity | undefined): LockStatus {
  const state = readLockState(device?.[DoorLock.ATTR_LOCKSTATE]);
  const errors = device?.[DeviceAdvanced.ATTR_ERRORS];
  const jammed = errors != null && Object.hasOwn(errors, WARN_JAM);

  let target: LockTarget | null = DoorLock.LOCKSTATE_LOCKED;
  if (!device) target = null;
  else if (state === DoorLock.LOCKSTATE_LOCKED) target = DoorLock.LOCKSTATE_UNLOCKED;

  let label = 'Unknown';
  if (jammed) label = 'Jammed';
  else if (state) label = STATE_LABELS[state];

  return { state, jammed, label, target };
}
