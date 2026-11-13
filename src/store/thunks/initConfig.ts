/**
 * Shared core config initializer.
 *
 * Must be awaited before any @arcus/core auth or service calls.
 *
 * Production builds read the platform URLs at runtime from server.json, which
 * the ui-server container writes from its ARCUS_* environment on start
 * (docker/ui-server/run-nginx), so one image works against any platform. Any
 * value it leaves empty — and everything in dev, where there is no such file —
 * falls back to the NEXT_PUBLIC_* values inlined at build time (the hub Wi-Fi
 * scan flag to NEXT_PUBLIC_ENABLE_HUB_WIFI_SCAN, then off). The image bakes
 * none in, so if server.json can't be loaded there are no URLs at all, and this
 * throws rather than point the client at the ui-server itself.
 */

import { setConfig } from '@arcus/core/config';
import Bridge from '@arcus/core/bridge';

/** server.json as written by run-nginx: the same file, and legacy's keys for the platform URLs. */
export interface ServerConfig {
  apiUrl?: string;
  wsUrl?: string;
  /** From ARCUS_ENABLE_HUB_WIFI_SCAN. run-nginx writes a boolean; legacy wrote the raw 0/1. */
  enableHubWifiScan?: boolean | number | string;
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

/** Legacy read the flag with parseInt, so any non-zero number turns it on. */
function flagEnabled(value: boolean | number | string | undefined): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  return !Number.isNaN(n) && n !== 0;
}

export async function initializeCoreConfig(): Promise<void> {
  const server = await loadServerConfig();

  const apiUrl = trimSlash(server.apiUrl || process.env.NEXT_PUBLIC_API_URL || '');
  const wsUrl = trimSlash(server.wsUrl || process.env.NEXT_PUBLIC_WS_URL || '');
  if (!apiUrl || !wsUrl) {
    throw new Error('The platform URLs are not configured: server.json could not be loaded and none were built in');
  }
  // Always set by next.config.ts (the image tag, or the package.json version).
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '';

  const enableHubWifiScan =
    flagEnabled(server.enableHubWifiScan) ?? flagEnabled(process.env.NEXT_PUBLIC_ENABLE_HUB_WIFI_SCAN) ?? false;

  setConfig({ apiUrl, wsUrl, version, enableHubWifiScan });
  Bridge.configure({ apiUrl, version });
}
