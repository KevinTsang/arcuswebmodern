/**
 * Pet door helpers.
 *
 * A pet door's smart keys are not separate devices: the door exposes one
 * `pettoken` instance per supported key (pt1..ptN, up to
 * petdoor:numPetTokensSupported), with attributes such as
 * `pettoken:petName:pt1`. Ported from the legacy PetTokenList.
 */

import { PetDoor, PetToken } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

export interface PetDoorToken {
  /** Instance key on the pet door, e.g. "pt1". */
  instance: string;
  /** 1-based position of the instance. */
  index: number;
  /** Platform token id, passed to petdoor:RemoveToken. */
  tokenId: number | null;
  paired: boolean;
  /** The pet name, or "Smart Key N" when none is set. */
  petName: string;
}

/** Attribute key of a pettoken attribute on one instance, e.g. `pettoken:petName:pt1`. */
export function petTokenAttr(attr: string, instance: string): string {
  return `${attr}:${instance}`;
}

export function defaultSmartKeyName(index: number): string {
  return `Smart Key ${index}`;
}

/** All smart key slots on the door, paired or not, in slot order. */
export function getPetDoorTokens(device: DeviceEntity | undefined): PetDoorToken[] {
  if (!device) return [];
  const count = Number(device[PetDoor.ATTR_NUMPETTOKENSSUPPORTED] ?? 0);
  if (!Number.isFinite(count) || count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    const instance = `pt${index}`;
    const name = device[petTokenAttr(PetToken.ATTR_PETNAME, instance)];
    const tokenId = device[petTokenAttr(PetToken.ATTR_TOKENID, instance)];
    return {
      instance,
      index,
      tokenId: typeof tokenId === 'number' ? tokenId : null,
      paired: device[petTokenAttr(PetToken.ATTR_PAIRED, instance)] === true,
      petName: typeof name === 'string' && name.length > 0 ? name : defaultSmartKeyName(index),
    };
  });
}

/** Paired smart keys in slot order. */
export function getPairedPetDoorTokens(device: DeviceEntity | undefined): PetDoorToken[] {
  return getPetDoorTokens(device).filter((t) => t.paired);
}

export function getPetDoorLockLabel(lockState: string | undefined): string {
  switch (lockState) {
    case PetDoor.LOCKSTATE_LOCKED:
      return 'Locked';
    case PetDoor.LOCKSTATE_UNLOCKED:
      return 'Unlocked';
    case PetDoor.LOCKSTATE_AUTO:
      return 'Auto';
    default:
      return 'Unknown';
  }
}
