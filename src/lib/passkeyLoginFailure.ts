/**
 * Why a passkey login failed, and what the login page says about it.
 *
 * Ported from passkeyLoginErrorMessage in src/pages/login/login.js. The thunk
 * classifies the rejection itself, because createAsyncThunk keeps only an
 * error's name and message, and the classification needs the HTTP status.
 */

import { SocketOpenError } from '@arcus/core/auth';
import { PasskeyRequestError } from '@arcus/core/passkey';

const MESSAGES = {
  /** The browser prompt was aborted, so nothing went wrong. */
  cancelled: null,
  // Browsers report a closed prompt, a timeout, and having no passkey for this
  // site on the device the same way, so the message has to fit all of them.
  'no-passkey': 'No passkey was used. Please try again, or log in with your password.',
  /** The platform has passkeys turned off, or this origin can't use them. */
  unavailable: 'Passkeys are not available right now. Please log in with your password.',
  'rate-limited': 'Too many attempts. Please wait a few minutes and try again.',
  /** The platform didn't accept the passkey. */
  rejected: 'That passkey could not be used to log in. Please log in with your password.',
  server: 'A server error occurred. Please try again later.',
  network: 'Unable to reach the server. Please check your connection and try again.',
  /** The passkey was accepted, but the WebSocket didn't connect. */
  connection: 'Unable to connect to Arcus. Please try again later.',
  unknown: 'Something went wrong while signing in. Please try again.',
} as const satisfies Record<string, string | null>;

export type PasskeyLoginFailure = keyof typeof MESSAGES;

/**
 * Classify a rejection from auth.loginWithPasskey: the passkey requests, the
 * browser prompt, or opening the socket afterwards.
 */
export function classifyPasskeyLoginError(error: unknown): PasskeyLoginFailure {
  if (error instanceof PasskeyRequestError) {
    if (error.status === 0) return 'network';
    if (error.status === 404) return 'unavailable';
    if (error.status === 429) return 'rate-limited';
    if (error.status >= 500) return 'server';
    return 'rejected';
  }
  if (error instanceof SocketOpenError) return 'connection';

  switch (error instanceof DOMException ? error.name : undefined) {
    case 'AbortError':
      return 'cancelled';
    case 'NotAllowedError':
      return 'no-passkey';
    // The page's origin doesn't match the platform's passkey.rp.id.
    case 'SecurityError':
      return 'unavailable';
    default:
      return 'unknown';
  }
}

/** Whether a caught value is the PasskeyLoginFailure passkeyLoginThunk rejects with. */
export function isPasskeyLoginFailure(value: unknown): value is PasskeyLoginFailure {
  return typeof value === 'string' && Object.hasOwn(MESSAGES, value);
}

/** The message to show for a failed passkey login, or null when there's nothing to say. */
export function passkeyLoginErrorMessage(failure: PasskeyLoginFailure): string | null {
  return MESSAGES[failure];
}
