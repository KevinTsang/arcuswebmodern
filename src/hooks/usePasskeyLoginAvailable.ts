'use client';

import { useSyncExternalStore } from 'react';
import { isPasskeyLoginSupported } from '@arcus/core/passkey';

// Neither the flag nor browser support changes while the page is open.
const subscribe = () => () => {};

function isAvailable(): boolean {
  // Set only when the platform's client-bridge has passkey.rp.id set.
  return process.env.NEXT_PUBLIC_ENABLE_PASSKEYS === '1' && isPasskeyLoginSupported();
}

/**
 * Whether to offer passkey login: the build enables it
 * (NEXT_PUBLIC_ENABLE_PASSKEYS=1) and the browser supports it. False while
 * prerendering, so the static page hydrates as rendered and the button
 * appears once the browser has been checked.
 */
export function usePasskeyLoginAvailable(): boolean {
  return useSyncExternalStore(subscribe, isAvailable, () => false);
}
