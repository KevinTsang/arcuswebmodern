/**
 * Hub firmware helpers.
 *
 * The platform updates hub firmware on its own: a hub that registers with an
 * out-of-date image downloads and applies the current one before
 * place:RegisterHubV2 reports REGISTERED, and a registered hub that restarts
 * to apply an update reports hubadv:lastRestartReason = FIRMWARE_UPDATE while
 * it is offline. Neither the legacy client nor this one can start an update:
 * hubadv:FirmwareUpdate needs an image URL and is an admin/support command.
 */

import { Hub, HubAdvanced } from '@arcus/core';
import type { HubData } from '@/store/entityTypes';

/** place:RegisterHubV2 states during which the hub is updating its firmware. */
export const HubFirmwareState = {
  DOWNLOADING: 'DOWNLOADING',
  APPLYING: 'APPLYING',
} as const;

export type HubFirmwareStateValue = typeof HubFirmwareState[keyof typeof HubFirmwareState];

/**
 * How long each firmware phase may last before registration gives up and
 * reports the update as failed (legacy pairing/connect/hub).
 */
export const HUB_FIRMWARE_TIMEOUTS: Record<HubFirmwareStateValue, number> = {
  [HubFirmwareState.DOWNLOADING]: 11 * 60 * 1000,
  [HubFirmwareState.APPLYING]: 5 * 60 * 1000,
};

/** Whether a RegisterHubV2 state means the hub is downloading or applying firmware. */
export function isHubFirmwareState(state: string | null | undefined): state is HubFirmwareStateValue {
  return state === HubFirmwareState.DOWNLOADING || state === HubFirmwareState.APPLYING;
}

/** Whether a firmware phase entered at `since` has run past its timeout at `now`. */
export function hubFirmwareTimedOut(state: string, since: number, now: number): boolean {
  if (!isHubFirmwareState(state)) return false;
  return now - since >= HUB_FIRMWARE_TIMEOUTS[state];
}

/** Clamp a platform progress value to a whole 0–100 percentage. */
export function hubFirmwareProgressPercent(progress: number | null | undefined): number {
  if (typeof progress !== 'number' || Number.isNaN(progress)) return 0;
  return Math.round(Math.min(100, Math.max(0, progress)));
}

/** The hub's firmware version (hubadv:osver), or '' when unknown. */
export function hubFirmwareVersion(hub: HubData | null | undefined): string {
  const version = hub?.[HubAdvanced.ATTR_OSVER];
  return typeof version === 'string' ? version : '';
}

/** Whether an offline hub went down to apply a firmware update. */
export function isHubFirmwareUpdating(hub: HubData | null | undefined): boolean {
  if (!hub) return false;
  return hub[Hub.ATTR_STATE] === Hub.STATE_DOWN
    && hub[HubAdvanced.ATTR_LASTRESTARTREASON] === HubAdvanced.LASTRESTARTREASON_FIRMWARE_UPDATE;
}
