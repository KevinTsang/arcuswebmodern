/**
 * Hand-written constants for the struct types used by the Doors & Locks
 * subsystem (`subdoorsnlocks`). The generated capabilities file only covers
 * capability attributes and commands, not the values inside these structs.
 *
 * - `LockAuthorizationState` — entries of `subdoorsnlocks:authorizationByLock`.
 * - `LockAuthorizationOperation` — items of `subdoorsnlocks:AuthorizePeople`'s `operations`.
 * - `DoorChimeConfig` — entries of `subdoorsnlocks:chimeConfig`.
 */

export const LockAuthorizationState = {
  ATTR_PERSON: 'person',
  ATTR_STATE: 'state',
  STATE_AUTHORIZED: 'AUTHORIZED',
  STATE_UNAUTHORIZED: 'UNAUTHORIZED',
  STATE_PENDING: 'PENDING',
} as const;

export const LockAuthorizationOperation = {
  ATTR_PERSON: 'person',
  ATTR_OPERATION: 'operation',
  OPERATION_AUTHORIZE: 'AUTHORIZE',
  OPERATION_DEAUTHORIZE: 'DEAUTHORIZE',
} as const;

export const DoorChimeConfig = {
  ATTR_DEVICE: 'device',
  ATTR_ENABLED: 'enabled',
} as const;
