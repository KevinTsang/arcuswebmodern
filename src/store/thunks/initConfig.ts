/**
 * Shared core config initializer.
 *
 * Must be called before any @arcus/core auth or service calls.
 */

import { setConfig } from '@arcus/core/config';
import Bridge from '@arcus/core/bridge';

export function initializeCoreConfig(): void {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? '';
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
  const redirectUrl = process.env.NEXT_PUBLIC_REDIRECT_URL ?? '';
  const isProduction = process.env.NODE_ENV === 'production';

  setConfig({ apiUrl, wsUrl, version, redirectUrl, isProduction });
  Bridge.configure({ apiUrl, version });
}
