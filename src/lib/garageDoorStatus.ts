/**
 * One reading of a garage door's state, shared by the device status line
 * (getDeviceStatusText) and the OpenCloseDoor control so they always agree.
 */

import { DeviceAdvanced, MotorizedDoor } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

/**
 * devadv:errors key the garage door drivers set when the door is obstructed.
 * While the key is present the drivers drop every motdoor:doorstate write
 * (they test `containsKey`, not the message) until the door is operated
 * locally and reports OPEN or CLOSED again.
 */
export const ERR_OBSTRUCTION = 'ERR_OBSTRUCTION';

/** motdoor:doorstate values the platform defines. */
export type DoorState =
  | typeof MotorizedDoor.DOORSTATE_CLOSED
  | typeof MotorizedDoor.DOORSTATE_CLOSING
  | typeof MotorizedDoor.DOORSTATE_OBSTRUCTION
  | typeof MotorizedDoor.DOORSTATE_OPENING
  | typeof MotorizedDoor.DOORSTATE_OPEN;

/** motdoor:doorstate values the drivers accept as a write. */
export type DoorTarget = typeof MotorizedDoor.DOORSTATE_OPEN | typeof MotorizedDoor.DOORSTATE_CLOSED;

export interface GarageDoorStatus {
  /** Reported doorstate, or null when it is missing or not a known value. */
  state: DoorState | null;
  /** The door reports OBSTRUCTION or devadv:errors has ERR_OBSTRUCTION. */
  obstructed: boolean;
  /** Open, Closed, Opening, Closing, Obstructed or Unknown. */
  label: string;
  /**
   * doorstate the control should write, or null when the drivers would drop
   * the write. Close is offered in every state except a settled CLOSED door
   * (including OPENING/CLOSING), so a lost final report never leaves the door
   * without a remote Close.
   */
  target: DoorTarget | null;
}

const STATE_LABELS: Record<DoorState, string> = {
  [MotorizedDoor.DOORSTATE_CLOSED]: 'Closed',
  [MotorizedDoor.DOORSTATE_CLOSING]: 'Closing',
  [MotorizedDoor.DOORSTATE_OBSTRUCTION]: 'Obstructed',
  [MotorizedDoor.DOORSTATE_OPENING]: 'Opening',
  [MotorizedDoor.DOORSTATE_OPEN]: 'Open',
};

function readDoorState(value: unknown): DoorState | null {
  switch (value) {
    case MotorizedDoor.DOORSTATE_CLOSED:
    case MotorizedDoor.DOORSTATE_CLOSING:
    case MotorizedDoor.DOORSTATE_OBSTRUCTION:
    case MotorizedDoor.DOORSTATE_OPENING:
    case MotorizedDoor.DOORSTATE_OPEN:
      return value;
    default:
      return null;
  }
}

export function getGarageDoorStatus(device: DeviceEntity | undefined): GarageDoorStatus {
  const state = readDoorState(device?.[MotorizedDoor.ATTR_DOORSTATE]);
  const errors = device?.[DeviceAdvanced.ATTR_ERRORS];
  const writesBlocked = errors != null && Object.hasOwn(errors, ERR_OBSTRUCTION);
  const obstructed = writesBlocked || state === MotorizedDoor.DOORSTATE_OBSTRUCTION;

  let target: DoorTarget | null = MotorizedDoor.DOORSTATE_CLOSED;
  if (!device || writesBlocked) target = null;
  else if (state === MotorizedDoor.DOORSTATE_CLOSED) target = MotorizedDoor.DOORSTATE_OPEN;

  let label = 'Unknown';
  if (obstructed) label = STATE_LABELS[MotorizedDoor.DOORSTATE_OBSTRUCTION];
  else if (state) label = STATE_LABELS[state];

  return { state, obstructed, label, target };
}
