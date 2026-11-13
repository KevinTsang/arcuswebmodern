/**
 * Z-Wave S2 PIN entry helpers (arcusplatform docs/zwave-s2-pin-pairing.md).
 *
 * The DSK is eight dash-separated groups of five decimal digits. The first
 * group is the PIN; the hub reports it as 00000 and the user types it in after
 * checking the other seven groups against the device label.
 */

/** `subpairing:PairingFailed` code: nobody entered the PIN in time. */
export const S2_PIN_TIMEOUT = 'zwave.s2.pin.timeout';
/** `subpairing:PairingFailed` code: a PIN was entered and secure pairing still failed. */
export const S2_PIN_FAILED = 'zwave.s2.pin.failed';
/** `SubmitS2Pin` error for a malformed PIN: nothing was sent, so the user may correct it. */
export const S2_PIN_INVALID_ERROR = 'request.param.invalid';
/** Error for a request that is no longer waiting (expired, answered or cancelled). */
export const S2_REQUEST_STATE_ERROR = 'request.state.invalid';

const DSK_PATTERN = /^\d{5}(-\d{5}){7}$/;

/** The response to `subpairing:GetS2PinRequest`. */
export interface S2PinRequest {
  requestId: string;
  dsk: string;
  /** When answers stop being accepted, in ms since the epoch. */
  expires: number;
}

/** True for a `PairingFailed` code about S2 PIN entry. */
export function isS2FailureCode(code: string | undefined | null): boolean {
  return code === S2_PIN_TIMEOUT || code === S2_PIN_FAILED;
}

/** True when `dsk` is eight dash-separated groups of five digits, each 0–65535. */
export function isValidDsk(dsk: string): boolean {
  if (!DSK_PATTERN.test(dsk)) return false;
  return dsk.split('-').every((group) => Number(group) <= 0xffff);
}

/** The eight five-digit groups of a DSK, or an empty list if it is malformed. */
export function dskGroups(dsk: string): string[] {
  return isValidDsk(dsk) ? dsk.split('-') : [];
}

/**
 * True when two DSKs agree on groups 2–8, the part the hub knows. Group 1 is
 * the PIN, which the hub reports as 00000.
 */
export function dskTailsMatch(a: string, b: string): boolean {
  const ga = dskGroups(a);
  const gb = dskGroups(b);
  if (ga.length !== 8 || gb.length !== 8) return false;
  return ga.slice(1).every((group, i) => group === gb[i + 1]);
}

/** True for a PIN the platform accepts: exactly five ASCII digits, 00000–65535. */
export function isValidS2Pin(pin: string): boolean {
  return /^\d{5}$/.test(pin) && Number(pin) <= 0xffff;
}

/** Whole seconds left until `expires` (ms since the epoch), never negative. */
export function secondsUntil(expires: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((expires - now) / 1000));
}

/** `m:ss` for a countdown. */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** A platform error as the Bridge rejects with it: `{ code, message }`, or an Error. */
export interface PlatformError {
  code?: string;
  message?: string;
}

/** The platform error code of a rejected Bridge request, if it has one. */
export function errorCode(error: PlatformError | Error | null | undefined): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}
