import { Base, PairingDevice } from '@arcus/core';
import {
  KIT_TAG,
  carriedOverStates,
  earlierDevices,
  findMispairedDevice,
  findPairedDevice,
  isInSearch,
  isKitDevice,
  isMispaired,
  isPaired,
  isSettled,
  newPairingFlow,
  searchDevices,
} from '@/lib/pairingFlow';
import type { PairingFlow } from '@/components/pairing/types';
import type { SearchScope } from '@/lib/pairingFlow';
import { makePairingDevice } from '../helpers/factories';

// ── Helpers ───────────────────────────────────────────────────────────

const PAIRING_SUBSYSTEM = 'SERV:subpairing:place-1';
const { PAIRINGSTATE_PAIRING, PAIRINGSTATE_PAIRED, PAIRINGSTATE_MISPAIRED, PAIRINGSTATE_MISCONFIGURED } = PairingDevice;

const kit = (id: string, state: string) => makePairingDevice(id, state, { [Base.ATTR_TAGS]: [KIT_TAG] });
const customized = (id: string) =>
  makePairingDevice(id, PAIRINGSTATE_PAIRED, { [PairingDevice.ATTR_CUSTOMIZATIONS]: ['NAME'] });

// Pairing list when the flow started: a leftover PAIRED device, a past mispair,
// a misconfigured device and one still pairing.
const leftoverPlug = makePairingDevice('leftover-plug', PAIRINGSTATE_PAIRED);
const pastMispair = makePairingDevice('past-lock', PAIRINGSTATE_MISPAIRED);
const pastMisconfigured = makePairingDevice('past-valve', PAIRINGSTATE_MISCONFIGURED);
const stillPairing = makePairingDevice('slow-lock', PAIRINGSTATE_PAIRING);

const flow: PairingFlow = newPairingFlow(PAIRING_SUBSYSTEM, [leftoverPlug, pastMispair, pastMisconfigured, stillPairing]);

// ── Tests ─────────────────────────────────────────────────────────────

describe('pairingFlow – device states', () => {
  it('isPaired is true only for PAIRED', () => {
    expect(isPaired(makePairingDevice('a', PAIRINGSTATE_PAIRED))).toBe(true);
    expect(isPaired(makePairingDevice('a', PAIRINGSTATE_PAIRING))).toBe(false);
    expect(isPaired(makePairingDevice('a', PAIRINGSTATE_MISPAIRED))).toBe(false);
  });

  it('isMispaired covers MISPAIRED and MISCONFIGURED', () => {
    expect(isMispaired(makePairingDevice('a', PAIRINGSTATE_MISPAIRED))).toBe(true);
    expect(isMispaired(makePairingDevice('a', PAIRINGSTATE_MISCONFIGURED))).toBe(true);
    expect(isMispaired(makePairingDevice('a', PAIRINGSTATE_PAIRED))).toBe(false);
  });

  it('isKitDevice reads the KIT tag', () => {
    expect(isKitDevice(kit('a', PAIRINGSTATE_PAIRING))).toBe(true);
    expect(isKitDevice(makePairingDevice('a', PAIRINGSTATE_PAIRING, { [Base.ATTR_TAGS]: ['OTHER'] }))).toBe(false);
    expect(isKitDevice(makePairingDevice('a', PAIRINGSTATE_PAIRING))).toBe(false);
  });
});

describe('pairingFlow – newPairingFlow', () => {
  it('records the settled devices with their states, but not devices still pairing', () => {
    expect(flow).toEqual({
      pairingSubsystem: PAIRING_SUBSYSTEM,
      settled: {
        [leftoverPlug[Base.ATTR_ADDRESS]]: PAIRINGSTATE_PAIRED,
        [pastMispair[Base.ATTR_ADDRESS]]: PAIRINGSTATE_MISPAIRED,
        [pastMisconfigured[Base.ATTR_ADDRESS]]: PAIRINGSTATE_MISCONFIGURED,
      },
    });
  });

  it('starts empty from an empty pairing list', () => {
    expect(newPairingFlow(PAIRING_SUBSYSTEM, [])).toEqual({ pairingSubsystem: PAIRING_SUBSYSTEM, settled: {} });
  });
});

describe('pairingFlow – isSettled / isInSearch', () => {
  it('treats a record still in its recorded state as settled', () => {
    expect(isSettled(leftoverPlug, flow)).toBe(true);
    expect(isSettled(pastMispair, flow)).toBe(true);
    expect(isInSearch(leftoverPlug, flow)).toBe(false);
    expect(isInSearch(pastMispair, flow)).toBe(false);
  });

  it('counts a record whose state changed since it was recorded as part of the search', () => {
    // The user reset the mispaired lock and it is pairing again
    const repairing = makePairingDevice('past-lock', PAIRINGSTATE_PAIRING);
    expect(isSettled(repairing, flow)).toBe(false);
    expect(isInSearch(repairing, flow)).toBe(true);
  });

  it('counts a device that was still pairing when the flow started', () => {
    const finished = makePairingDevice('slow-lock', PAIRINGSTATE_PAIRED);
    expect(isInSearch(finished, flow)).toBe(true);
  });

  it('excludes KIT records and devices another client has customized', () => {
    expect(isInSearch(kit('kit-motion', PAIRINGSTATE_PAIRED), flow)).toBe(false);
    expect(isInSearch(customized('other-client'), flow)).toBe(false);
  });
});

describe('pairingFlow – finding the search result', () => {
  const newPlug = makePairingDevice('new-plug', PAIRINGSTATE_PAIRED);
  const newMispair = makePairingDevice('new-sensor', PAIRINGSTATE_MISPAIRED);

  it('findPairedDevice skips leftovers, KIT records and customized devices', () => {
    const list = [leftoverPlug, kit('kit-motion', PAIRINGSTATE_PAIRED), customized('other-client'), newPlug];
    expect(findPairedDevice(list, flow)).toBe(newPlug);
    expect(findPairedDevice([leftoverPlug, stillPairing], flow)).toBeUndefined();
  });

  it('findMispairedDevice skips past mispairs and KIT records', () => {
    expect(findMispairedDevice([pastMispair, pastMisconfigured, kit('kit-motion', PAIRINGSTATE_MISPAIRED)], flow))
      .toBeUndefined();
    expect(findMispairedDevice([pastMispair, newMispair], flow)).toBe(newMispair);
  });

  it('searchDevices lists only what the current search found', () => {
    const joining = makePairingDevice('joining', PAIRINGSTATE_PAIRING);
    const list = [leftoverPlug, pastMispair, kit('kit-motion', PAIRINGSTATE_PAIRING), customized('other-client'), joining, newMispair];
    expect(searchDevices(list, flow)).toEqual([joining, newMispair]);
  });

  it('earlierDevices lists past mispairs but not KIT records or leftover PAIRED devices', () => {
    const kitMispair = makePairingDevice('kit-lock', PAIRINGSTATE_MISPAIRED, { [Base.ATTR_TAGS]: [KIT_TAG] });
    const withKit = newPairingFlow(PAIRING_SUBSYSTEM, [leftoverPlug, pastMispair, pastMisconfigured, kitMispair]);
    expect(earlierDevices([leftoverPlug, pastMispair, pastMisconfigured, kitMispair, newMispair], withKit))
      .toEqual([pastMispair, pastMisconfigured]);
  });
});

describe('pairingFlow – search scope', () => {
  const MOTION = 'SERV:product:motion';
  const CONTACT = 'SERV:product:contact';
  const withProduct = (id: string, state: string, product?: string) =>
    makePairingDevice(id, state, product ? { [PairingDevice.ATTR_PRODUCTADDRESS]: product } : {});

  const carriedContact = withProduct('contact-2', PAIRINGSTATE_PAIRED, CONTACT);
  const carriedMotion = withProduct('motion-early', PAIRINGSTATE_PAIRED, MOTION);
  const carriedUnknown = withProduct('unknown', PAIRINGSTATE_PAIRED);
  const carriedMispair = withProduct('contact-3', PAIRINGSTATE_MISPAIRED, CONTACT);
  const scope = (productAddress: string | null): SearchScope => ({
    productAddress,
    carriedOver: carriedOverStates([carriedContact, carriedMotion, carriedUnknown, carriedMispair], flow),
  });

  it('carriedOverStates records finished records that are not settled, KIT or customized, with their states', () => {
    const list = [leftoverPlug, pastMispair, stillPairing, kit('kit', PAIRINGSTATE_PAIRED), customized('c'), carriedContact, carriedMispair];
    expect(carriedOverStates(list, flow)).toEqual({
      [carriedContact[Base.ATTR_ADDRESS]]: PAIRINGSTATE_PAIRED,
      [carriedMispair[Base.ATTR_ADDRESS]]: PAIRINGSTATE_MISPAIRED,
    });
  });

  it('skips carried-over records identified as another product', () => {
    expect(findPairedDevice([carriedContact], flow, scope(MOTION))).toBeUndefined();
    expect(findMispairedDevice([carriedMispair], flow, scope(MOTION))).toBeUndefined();
  });

  it('keeps carried-over records of the product, or of an unknown product', () => {
    expect(findPairedDevice([carriedContact, carriedMotion], flow, scope(MOTION))).toBe(carriedMotion);
    expect(findPairedDevice([carriedContact, carriedUnknown], flow, scope(MOTION))).toBe(carriedUnknown);
  });

  it('keeps every carried-over record when no product is being paired', () => {
    expect(findPairedDevice([carriedContact], flow, scope(null))).toBe(carriedContact);
  });

  it('counts a carried-over record again once its state has changed', () => {
    // The carried-over mispair was reset and paired again
    const repaired = withProduct('contact-3', PAIRINGSTATE_PAIRED, CONTACT);
    expect(findPairedDevice([repaired], flow, scope(MOTION))).toBe(repaired);
  });

  it('lists carried-over records of another product as earlier, not as found by this search', () => {
    const joining = withProduct('joining', PAIRINGSTATE_PAIRING);
    const list = [leftoverPlug, pastMispair, carriedContact, carriedMotion, carriedMispair, joining];
    expect(searchDevices(list, flow, scope(MOTION))).toEqual([carriedMotion, joining]);
    expect(earlierDevices(list, flow, scope(MOTION))).toEqual([pastMispair, carriedContact, carriedMispair]);
  });

  it('lists every carried-over record as found when no product is being paired', () => {
    expect(searchDevices([carriedContact], flow, scope(null))).toEqual([carriedContact]);
    expect(earlierDevices([carriedContact], flow, scope(null))).toEqual([]);
  });

  it('keeps a device that paired during this search whatever product it was identified as', () => {
    const rebranded = withProduct('rebranded', PAIRINGSTATE_PAIRED, 'SERV:product:other-brand');
    expect(findPairedDevice([carriedContact, rebranded], flow, scope(MOTION))).toBe(rebranded);
  });
});
