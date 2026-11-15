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

/**
 * What the pairing page knows about the current search beyond the flow: the
 * product being searched for, and the records carried over from an earlier
 * search in the flow.
 */
export interface SearchScope {
  /** The product being searched for, or null when there is none. */
  productAddress: string | null;
  /**
   * Records already PAIRED, MISPAIRED or MISCONFIGURED, but not settled, when
   * this page's first search started: devices that joined during an earlier
   * search in the flow (for example a second device that joined alongside the
   * one customized before Pair Another), mapped to the state each was in, as
   * in `PairingFlow.settled`. A record whose state has changed since (a reset
   * mispaired device pairing again) is no longer carried over.
   */
  carriedOver: Readonly<Record<string, string>>;
}

/**
 * The records that are already a finished pairing result but not settled,
 * mapped to their states: the carried-over records of a `SearchScope`.
 */
export function carriedOverStates(devices: PairingDeviceData[], flow: PairingFlow): Record<string, string> {
  const carriedOver: Record<string, string> = {};
  for (const device of devices) {
    if ((isPaired(device) || isMispaired(device)) && isInSearch(device, flow)) {
      carriedOver[device[Base.ATTR_ADDRESS]] = device[PairingDevice.ATTR_PAIRINGSTATE];
    }
  }
  return carriedOver;
}

/**
 * The record's product is unknown, or is the product being searched for.
 * `pairdev:productAddress` is the product the driver identified, which can
 * differ from the catalog entry the user picked (rebranded or generic products),
 * so it only rules out carried-over records, never devices that pair during
 * the current search.
 */
function matchesProduct(device: PairingDeviceData, productAddress: string | null): boolean {
  const deviceProduct = device[PairingDevice.ATTR_PRODUCTADDRESS];
  return !productAddress || !deviceProduct || deviceProduct === productAddress;
}

/**
 * The record is still in the state it was carried over in, and was identified
 * as a product other than the one being searched for. Without this check, a
 * contact sensor that joined during an earlier search would be customized as
 * the motion sensor the user is now pairing.
 */
function isCarriedOverOtherProduct(device: PairingDeviceData, scope?: SearchScope): boolean {
  if (!scope) return false;
  const carriedOverState = scope.carriedOver[device[Base.ATTR_ADDRESS]];
  return carriedOverState === device[PairingDevice.ATTR_PAIRINGSTATE] && !matchesProduct(device, scope.productAddress);
}

/** The record can be the current search's result. */
function isSearchResult(device: PairingDeviceData, flow: PairingFlow, scope?: SearchScope): boolean {
  return isInSearch(device, flow) && !isCarriedOverOtherProduct(device, scope);
}

/** Records found by the current search, in any state. */
export function searchDevices(devices: PairingDeviceData[], flow: PairingFlow, scope?: SearchScope): PairingDeviceData[] {
  return devices.filter((d) => isSearchResult(d, flow, scope));
}

/** The device the current search paired, if any. */
export function findPairedDevice(
  devices: PairingDeviceData[],
  flow: PairingFlow,
  scope?: SearchScope,
): PairingDeviceData | undefined {
  return devices.find((d) => isPaired(d) && isSearchResult(d, flow, scope));
}

/** A device the current search paired improperly, if any. */
export function findMispairedDevice(
  devices: PairingDeviceData[],
  flow: PairingFlow,
  scope?: SearchScope,
): PairingDeviceData | undefined {
  return devices.find((d) => isMispaired(d) && isSearchResult(d, flow, scope));
}

/**
 * Records from an earlier pairing that the search screen lists, labeled as
 * earlier, without treating them as this search's result: improperly paired
 * records left from before the flow (the legacy client keeps listing past
 * mispairs), and carried-over records identified as another product.
 */
export function earlierDevices(devices: PairingDeviceData[], flow: PairingFlow, scope?: SearchScope): PairingDeviceData[] {
  return devices.filter((d) =>
    (!isKitDevice(d) && isMispaired(d) && isSettled(d, flow))
    || (isInSearch(d, flow) && isCarriedOverOtherProduct(d, scope)));
}
