/**
 * Shared core config initializer.
 *
 * Must be awaited before any @arcus/core auth or service calls.
 *
 * Production builds read the platform URLs at runtime from server.json, which
 * the ui-server container writes from its ARCUS_* environment on start
 * (docker/ui-server/run-nginx), so one image works against any platform. Any
 * value it leaves empty — and everything in dev, where there is no such file —
 * falls back to the NEXT_PUBLIC_* values inlined at build time.
 */

import { setConfig } from '@arcus/core/config';
import Bridge from '@arcus/core/bridge';

/** server.json as written by run-nginx — the same file and keys as the legacy ui-server. */
export interface ServerConfig {
  apiUrl?: string;
  redirectUrl?: string;
  wsUrl?: string;
  iosDownloadUrl?: string;
  androidDownloadUrl?: string;
  /** Feature flags, written as 0 or 1. */
  enableYearlySubscription?: number;
  enableHubWifiScan?: number;
  enableBatteryPercentage?: number;
}

const SERVER_CONFIG_URL = '/build/dist/config/server.json';

let serverConfig: ServerConfig | undefined;

async function loadServerConfig(): Promise<ServerConfig> {
  if (serverConfig) return serverConfig;
  if (process.env.NODE_ENV !== 'production') return {};

  try {
    const res = await fetch(SERVER_CONFIG_URL, { cache: 'no-store' });
    if (res.ok) serverConfig = (await res.json()) as ServerConfig;
  } catch {
    // Unreachable or malformed: use the build-time values, and retry next call.
  }
  return serverConfig ?? {};
}

/** Legacy deployments often set ARCUS_*_URI with a trailing "/"; the client appends its own paths. */
function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function initializeCoreConfig(): Promise<void> {
  const server = await loadServerConfig();

  const apiUrl = trimSlash(server.apiUrl || process.env.NEXT_PUBLIC_API_URL || '');
  const wsUrl = trimSlash(server.wsUrl || process.env.NEXT_PUBLIC_WS_URL || '');
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
  const redirectUrl = trimSlash(server.redirectUrl || process.env.NEXT_PUBLIC_REDIRECT_URL || '');
  const isProduction = process.env.NODE_ENV === 'production';

  setConfig({ apiUrl, wsUrl, version, redirectUrl, isProduction });
  Bridge.configure({ apiUrl, version });
}
