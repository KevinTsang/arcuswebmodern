/**
 * Which pairing records belong to the current search.
 *
 * ListPairingDevices returns every pairing record at the place: devices from
 * earlier sessions that were never dismissed, records created for a kit's
 * devices, and devices other clients have already customized. The pairing page
 * picks the device to customize by itself, so it only considers records that
 * changed during the current pairing flow (see `PairingFlow`).
 */

import { Base, PairingDevice } from '@arcus/core';
import type { PairingDevice as PairingDeviceData } from '@/store/entityTypes';
import type { PairingFlow } from '@/components/pairing/types';

/** Tag the platform puts on the pairing records it creates for a kit's devices. */
export const KIT_TAG = 'KIT';

const SETTLED_STATES: ReadonlySet<string> = new Set([
  PairingDevice.PAIRINGSTATE_PAIRED,
  PairingDevice.PAIRINGSTATE_MISPAIRED,
  PairingDevice.PAIRINGSTATE_MISCONFIGURED,
]);

export function isPaired(device: PairingDeviceData): boolean {
  return device[PairingDevice.ATTR_PAIRINGSTATE] === PairingDevice.PAIRINGSTATE_PAIRED;
}

/** MISPAIRED or MISCONFIGURED: shown to the user as "Improperly Paired". */
export function isMispaired(device: PairingDeviceData): boolean {
  const state = device[PairingDevice.ATTR_PAIRINGSTATE];
  return state === PairingDevice.PAIRINGSTATE_MISPAIRED || state === PairingDevice.PAIRINGSTATE_MISCONFIGURED;
}

/**
 * Kit devices are set up from Kit Activation, never as the product being
 * paired. The legacy client keeps KIT records out of its pairing list too
 * (pages/pairing/pairing.js and pages/product-catalog/product-catalog.js).
 */
export function isKitDevice(device: PairingDeviceData): boolean {
  return (device[Base.ATTR_TAGS] ?? []).includes(KIT_TAG);
}

/**
 * Start a flow from the pairing list as it was before the hub entered pairing
 * mode. Records still PAIRING are left out: if one finishes during the flow it
 * counts as paired by this flow, as in the legacy client.
 */
export function newPairingFlow(pairingSubsystem: string, devices: PairingDeviceData[]): PairingFlow {
  const settled: Record<string, string> = {};
  for (const device of devices) {
    const state = device[PairingDevice.ATTR_PAIRINGSTATE];
    if (SETTLED_STATES.has(state)) settled[device[Base.ATTR_ADDRESS]] = state;
  }
  return { pairingSubsystem, settled };
}

/** The record is still in the state the flow recorded for it: left over, or already handled. */
export function isSettled(device: PairingDeviceData, flow: PairingFlow): boolean {
  return flow.settled[device[Base.ATTR_ADDRESS]] === device[PairingDevice.ATTR_PAIRINGSTATE];
}

/**
 * The record is part of the current search: not a kit device, not settled,
 * and not yet customized by any client.
 */
export function isInSearch(device: PairingDeviceData, flow: PairingFlow): boolean {
  return !isKitDevice(device)
    && !isSettled(device, flow)
    && (device[PairingDevice.ATTR_CUSTOMIZATIONS] ?? []).length === 0;
}

/** Records found by the current search, in any state. */
export function searchDevices(devices: PairingDeviceData[], flow: PairingFlow): PairingDeviceData[] {
  return devices.filter((d) => isInSearch(d, flow));
}

/** The device the current search paired, if any. */
export function findPairedDevice(devices: PairingDeviceData[], flow: PairingFlow): PairingDeviceData | undefined {
  return devices.find((d) => isPaired(d) && isInSearch(d, flow));
}

/** A device the current search paired improperly, if any. */
export function findMispairedDevice(devices: PairingDeviceData[], flow: PairingFlow): PairingDeviceData | undefined {
  return devices.find((d) => isMispaired(d) && isInSearch(d, flow));
}

/**
 * Improperly paired records left from before the current search. The legacy
 * client keeps listing past mispairs, so the search screen shows them too,
 * labeled as earlier, without treating them as this search's result.
 */
export function earlierMispairedDevices(devices: PairingDeviceData[], flow: PairingFlow): PairingDeviceData[] {
  return devices.filter((d) => !isKitDevice(d) && isMispaired(d) && isSettled(d, flow));
}
