/**
 * One reading of a water valve's state, shared by the device status line
 * (getDeviceStatusText) and the OpenCloseValve control so they always agree.
 */

import { Valve } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

/** valv:valvestate values the platform defines. */
export type ValveState =
  | typeof Valve.VALVESTATE_CLOSED
  | typeof Valve.VALVESTATE_OPEN
  | typeof Valve.VALVESTATE_OPENING
  | typeof Valve.VALVESTATE_CLOSING
  | typeof Valve.VALVESTATE_OBSTRUCTION;

/** valv:valvestate values the drivers accept as a write. */
export type ValveTarget = typeof Valve.VALVESTATE_OPEN | typeof Valve.VALVESTATE_CLOSED;

export interface ValveStatus {
  /** Reported valvestate, or null when it is missing or not a known value. */
  state: ValveState | null;
  /** Open, Closed, Opening, Closing, Obstructed or Unknown. */
  label: string;
  /**
   * valvestate the control should write, or null without a device. Close is
   * offered in every state except a settled CLOSED valve (including OPENING,
   * CLOSING and OBSTRUCTION, which every valve driver accepts), so a lost
   * final report or a stalled shutoff never blocks a remote Close.
   */
  target: ValveTarget | null;
}

const STATE_LABELS: Record<ValveState, string> = {
  [Valve.VALVESTATE_CLOSED]: 'Closed',
  [Valve.VALVESTATE_OPEN]: 'Open',
  [Valve.VALVESTATE_OPENING]: 'Opening',
  [Valve.VALVESTATE_CLOSING]: 'Closing',
  [Valve.VALVESTATE_OBSTRUCTION]: 'Obstructed',
};

function readValveState(value: unknown): ValveState | null {
  switch (value) {
    case Valve.VALVESTATE_CLOSED:
    case Valve.VALVESTATE_OPEN:
    case Valve.VALVESTATE_OPENING:
    case Valve.VALVESTATE_CLOSING:
    case Valve.VALVESTATE_OBSTRUCTION:
      return value;
    default:
      return null;
  }
}

export function getValveStatus(device: DeviceEntity | undefined): ValveStatus {
  const state = readValveState(device?.[Valve.ATTR_VALVESTATE]);

  let target: ValveTarget | null = Valve.VALVESTATE_CLOSED;
  if (!device) target = null;
  else if (state === Valve.VALVESTATE_CLOSED) target = Valve.VALVESTATE_OPEN;

  return { state, label: state ? STATE_LABELS[state] : 'Unknown', target };
}
