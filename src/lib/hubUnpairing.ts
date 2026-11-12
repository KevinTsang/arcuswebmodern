/**
 * hub:UnpairingRequest helpers.
 *
 * While the hub is in unpairing mode its Z-Wave controller runs a general
 * exclusion: any Z-Wave device that sends a node-info frame is removed from
 * the network, whichever device the user meant to remove. Every flow that puts
 * the hub into unpairing mode, directly (Z-Wave orphan removal) or through
 * dev:Remove (device removal), sends STOP_UNPAIRING on the way out.
 *
 * The hub agent ignores STOP_UNPAIRING when it isn't unpairing
 * (HubController.exitUnpairingMode), so a stop that turns out to be
 * unnecessary is harmless.
 */

import Bridge from '@arcus/core/bridge';
import { Hub } from '@arcus/core';

/** hub:UnpairingRequest `actionType` values (hubbase.xml). */
export const UnpairingAction = {
  START: 'START_UNPAIRING',
  STOP: 'STOP_UNPAIRING',
} as const;

/** Take the hub out of unpairing mode. Rejects if the request fails. */
export async function stopHubUnpairing(hubAddress: string): Promise<void> {
  await Bridge.request(Hub.CMD_UNPAIRINGREQUEST, hubAddress, { actionType: UnpairingAction.STOP });
}
