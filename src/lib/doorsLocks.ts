/**
 * Reading the Doors & Locks subsystem's struct attributes safely.
 *
 * `subdoorsnlocks:authorizationByLock` and `subdoorsnlocks:chimeConfig` come
 * straight from the platform. A malformed value (a lock mapped to null or an
 * object, an entry without a person) would otherwise reach `.filter` and
 * `.map` calls in the UI and break the tab, so anything that isn't the
 * documented shape is dropped here.
 */

import { DoorChimeConfig, LockAuthorizationState } from '@arcus/core';
import type {
  ChimeConfig, DoorChimeEntry, LockAuthorizationEntry, LockAuthorizationMap, LockAuthorizationStatus,
} from '@/store/entityTypes';

const LOCK_STATES: ReadonlySet<string> = new Set([
  LockAuthorizationState.STATE_AUTHORIZED,
  LockAuthorizationState.STATE_UNAUTHORIZED,
  LockAuthorizationState.STATE_PENDING,
]);

/** A raw struct from the platform: string keys, any JSON-ish values. */
type RawStruct = { [key: string]: string | number | boolean | null | undefined | object };

function isStruct(value: object | string | number | boolean | null | undefined): value is RawStruct {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toAuthorizationEntry(raw: RawStruct): LockAuthorizationEntry | null {
  const person = raw[LockAuthorizationState.ATTR_PERSON];
  const state = raw[LockAuthorizationState.ATTR_STATE];
  if (typeof person !== 'string' || typeof state !== 'string' || !LOCK_STATES.has(state)) return null;
  return { person, state: state as LockAuthorizationStatus };
}

/** `authorizationByLock`, keeping only locks mapped to arrays and well-formed entries. */
export function normalizeAuthorizationByLock(raw: object | null | undefined): LockAuthorizationMap {
  if (!isStruct(raw)) return {};
  const result: LockAuthorizationMap = {};
  for (const [lock, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    result[lock] = value
      .filter(isStruct)
      .map(toAuthorizationEntry)
      .filter((entry): entry is LockAuthorizationEntry => entry !== null);
  }
  return result;
}

function toChimeEntry(raw: RawStruct): DoorChimeEntry | null {
  const device = raw[DoorChimeConfig.ATTR_DEVICE];
  const enabled = raw[DoorChimeConfig.ATTR_ENABLED];
  if (typeof device !== 'string' || typeof enabled !== 'boolean') return null;
  return { device, enabled };
}

/** `chimeConfig`, keeping only well-formed entries. */
export function normalizeChimeConfig(raw: object | null | undefined): ChimeConfig {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isStruct)
    .map(toChimeEntry)
    .filter((entry): entry is DoorChimeEntry => entry !== null);
}

/** The `chimeConfig` value to write back: one struct per device, keyed with the struct constants. */
export function chimeConfigValue(config: ChimeConfig): RawStruct[] {
  return config.map((entry) => ({
    [DoorChimeConfig.ATTR_DEVICE]: entry.device,
    [DoorChimeConfig.ATTR_ENABLED]: entry.enabled,
  }));
}
