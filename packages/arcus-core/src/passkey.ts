/**
 * Passkey (WebAuthn) login through the platform's `/passkey/*` endpoints.
 *
 * Ported from src/models/passkey.js. A login takes two requests: the first
 * returns options for the browser along with a single-use `requestId`, and the
 * second sends the browser's credential back with that `requestId`. See
 * "Passkeys" in arcusplatform's docs/security.md.
 */

import { getConfig } from './config';

/** A `/passkey/*` request that failed. */
export class PasskeyRequestError extends Error {
  /** @param status The platform's error status, or 0 if it couldn't be reached. */
  constructor(readonly status: number) {
    super(status ? `Passkey request failed: ${status}` : 'Passkey request could not reach the platform');
    this.name = 'PasskeyRequestError';
  }
}

/** The platform's answer to `/passkey/LoginOptions`. */
interface PasskeyLoginOptions {
  requestId: string;
  publicKey: PublicKeyCredentialRequestOptionsJSON;
}

async function post(operation: string, body: object): Promise<Response> {
  const config = getConfig();
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl.replace(/\/+$/, '')}/passkey/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': config.version,
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  } catch {
    // fetch rejects only when no response came back at all.
    throw new PasskeyRequestError(0);
  }

  if (!response.ok) {
    throw new PasskeyRequestError(response.status);
  }
  return response;
}

/**
 * Whether this browser can log in with a passkey. The platform sends its
 * options as JSON, so the browser must be able to parse them.
 */
export function isPasskeyLoginSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof window.PublicKeyCredential?.parseRequestOptionsFromJSON === 'function'
    && !!navigator.credentials;
}

/**
 * Ask the browser for one of the person's passkeys and log in with it. On
 * success the platform sets the session cookie, as it does for a password
 * login. Rejects with a DOMException when the browser prompt ends without a
 * passkey, or a PasskeyRequestError when the platform refuses a request or
 * can't be reached.
 */
export async function passkeyLogin(isPublic: boolean): Promise<void> {
  const { requestId, publicKey } = (await (await post('LoginOptions', {})).json()) as PasskeyLoginOptions;

  const credential = (await navigator.credentials.get({
    publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(publicKey),
  })) as PublicKeyCredential | null;
  if (!credential) {
    throw new DOMException('The passkey prompt ended without a passkey', 'NotAllowedError');
  }

  await post('Login', { requestId, credential: credential.toJSON(), public: isPublic });
}
