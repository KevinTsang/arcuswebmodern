/**
 * Hub Wi-Fi helpers: the hub's network state, scan results and the
 * ARCUS_ENABLE_HUB_WIFI_SCAN flag.
 *
 * Ported from legacy's hub model (connectionType, isConnected*, isOffline),
 * the hub wifi-scan configurator and the arcus-wifi-scan form.
 */

import { Base, Hub, HubNetwork, HubWiFi } from '@arcus/core';
import { getConfig } from '@arcus/core/config';
import type { HubData } from '@/store/entityTypes';

/** How long a scan runs on the hub, in seconds (legacy's value). */
export const WIFI_SCAN_TIMEOUT_SECONDS = 30;

/** Hub events arrive under the `hub` namespace (address SERV:<hubId>:hub). */
export const HUB_WIFI_SCAN_RESULTS = `${Hub.NAMESPACE} ${HubWiFi.EVENT_WIFISCANRESULTS}`;
export const HUB_WIFI_CONNECT_RESULT = `${Hub.NAMESPACE} ${HubWiFi.EVENT_WIFICONNECTRESULT}`;

/** WiFiConnect's reply: CONNECTING means the hub is testing the network and will send a WiFiConnectResult. */
export const WIFI_CONNECT_STATUS_CONNECTING = 'CONNECTING';
/** WiFiConnectResult status for a working connection. */
export const WIFI_CONNECT_RESULT_OK = 'OK';

/** The hub's network state, read from its platform attributes. */
export interface HubNetworkStatus {
  address: string;
  name: string;
  /** Legacy treats a hub without hub:state, or DOWN, as offline. */
  online: boolean;
  /** hubnet:type: ETH, WIFI or 3G. */
  connectionType?: string;
  /** The hub has the hubwifi capability. */
  wifiCapable: boolean;
  /** The configured network, whether or not the hub is currently using it. */
  wifiSsid: string;
  wifiSecurity?: string;
  wifiRssi?: number;
}

/** One entry of a hubwifi:WiFiScanResults event (see hubwifi.xml). */
export interface WifiScanResult {
  ssid?: string;
  bssid?: string;
  mode?: string;
  /** e.g. ["WPA2-PSK", "WPA-PSK"]: the platform uses dashes, WiFiConnect wants underscores. */
  security?: string[];
  encryption?: string;
  channel?: number;
  /** Normalized RSSI, 0–100. */
  signal?: number;
}

export interface HubWifiScanResultsEvent {
  [Base.ATTR_ADDRESS]: string;
  scanResults?: WifiScanResult[];
  message?: string;
}

export interface HubWifiConnectResultEvent {
  [Base.ATTR_ADDRESS]: string;
  /** OK, BAD_PASSWD, NO_ADDR or NO_INTERNET. */
  status?: string;
  message?: string;
}

/** hubwifi:WiFiConnect's response. */
export interface HubWifiConnectResponse {
  /** CONNECTING, REFUSED, INVALID_SSID, INVALID_SECURITY or INVALID_KEY. */
  status?: string;
  message?: string;
}

/** A network to offer: one per SSID, with its securities in WiFiConnect's form. */
export interface WifiNetwork {
  ssid: string;
  bssid?: string;
  securities: string[];
  signal: number;
}

export interface SecurityOption {
  value: string;
  label: string;
}

export const SECURITY_OPTIONS: SecurityOption[] = [
  { value: HubWiFi.WIFISECURITY_NONE, label: 'None' },
  { value: HubWiFi.WIFISECURITY_WEP, label: 'WEP' },
  { value: HubWiFi.WIFISECURITY_WPA_PSK, label: 'WPA PSK' },
  { value: HubWiFi.WIFISECURITY_WPA2_PSK, label: 'WPA2 PSK' },
  { value: HubWiFi.WIFISECURITY_WPA_ENTERPRISE, label: 'WPA Enterprise' },
  { value: HubWiFi.WIFISECURITY_WPA2_ENTERPRISE, label: 'WPA2 Enterprise' },
];

const KNOWN_SECURITIES: string[] = SECURITY_OPTIONS.map((o) => o.value);

/** Whether hub Wi-Fi setup is offered (ARCUS_ENABLE_HUB_WIFI_SCAN). Off until the config is loaded. */
export function isHubWifiScanEnabled(): boolean {
  try {
    return getConfig().enableHubWifiScan === true;
  } catch {
    return false;
  }
}

export function readHubNetworkStatus(hub: HubData): HubNetworkStatus {
  const state = hub[Hub.ATTR_STATE] as string | undefined;
  const caps = (hub[Base.ATTR_CAPS] as string[] | undefined) ?? [];
  return {
    address: hub[Base.ATTR_ADDRESS],
    name: (hub[Hub.ATTR_NAME] as string | undefined) ?? '',
    online: !!state && state !== Hub.STATE_DOWN,
    connectionType: hub[HubNetwork.ATTR_TYPE] as string | undefined,
    wifiCapable: caps.includes(HubWiFi.NAMESPACE),
    wifiSsid: (hub[HubWiFi.ATTR_WIFISSID] as string | undefined) ?? '',
    wifiSecurity: hub[HubWiFi.ATTR_WIFISECURITY] as string | undefined,
    wifiRssi: hub[HubWiFi.ATTR_WIFIRSSI] as number | undefined,
  };
}

/** Human-readable connection, as legacy's hub connectionType. */
export function connectionLabel(status: HubNetworkStatus): string {
  if (!status.online) return 'No Connection';
  switch (status.connectionType) {
    case HubNetwork.TYPE_ETH:
      return 'Ethernet';
    case HubNetwork.TYPE_WIFI:
      return 'Wi-Fi';
    case HubNetwork.TYPE_3G:
      return 'Cellular Backup';
    default:
      return '';
  }
}

/** The hub has a network configured (legacy's hasConfiguredSSID). */
export function hasConfiguredWifi(status: HubNetworkStatus): boolean {
  return !!status.wifiSsid && !!status.wifiSecurity && KNOWN_SECURITIES.includes(status.wifiSecurity);
}

/** "WPA2-PSK" → "WPA2_PSK", the form WiFiConnect takes. */
export function normalizeSecurity(security: string): string {
  return security.toUpperCase().replace(/-/g, '_');
}

/** WPA2 PSK when the network offers it, otherwise its first security, otherwise none. */
export function preferredSecurity(securities: string[]): string {
  if (securities.includes(HubWiFi.WIFISECURITY_WPA2_PSK)) return HubWiFi.WIFISECURITY_WPA2_PSK;
  return securities[0] ?? HubWiFi.WIFISECURITY_NONE;
}

/**
 * Networks to offer, strongest first. Hidden networks (no SSID) are left out,
 * and an SSID seen from several access points is listed once, at its strongest.
 */
export function toNetworks(results: WifiScanResult[] | undefined): WifiNetwork[] {
  const bySsid = new Map<string, WifiNetwork>();
  for (const result of results ?? []) {
    if (!result.ssid) continue;
    const network: WifiNetwork = {
      ssid: result.ssid,
      bssid: result.bssid,
      securities: (result.security ?? []).map(normalizeSecurity),
      signal: result.signal ?? 0,
    };
    const seen = bySsid.get(network.ssid);
    if (!seen || network.signal > seen.signal) bySsid.set(network.ssid, network);
  }
  return [...bySsid.values()].sort((a, b) => b.signal - a.signal);
}

/** Signal bars, 0–4, from a 0–100 signal or a negative dBm RSSI (legacy's signalStrengthIcon). */
export function signalBars(signal: number): number {
  if (signal < 0) {
    if (signal < -100) return 0;
    if (signal < -85) return 1;
    if (signal < -70) return 2;
    if (signal < -55) return 3;
    return 4;
  }
  if (signal < 21) return 0;
  if (signal < 41) return 1;
  if (signal < 61) return 2;
  if (signal < 80) return 3;
  return 4;
}

/** Shown when a connection fails for a reason the hub didn't name (legacy's form error). */
export const WIFI_CONNECT_FAILED_MESSAGE =
  'Your hub failed to connect. Check the network name, security and password, and make sure your router and modem are plugged in and working.';

const CONNECT_FAILURE_MESSAGES: Record<string, string> = {
  BAD_PASSWD: 'The Wi-Fi password is incorrect.',
  INVALID_KEY: 'The Wi-Fi password is not valid for this network.',
  INVALID_SSID: 'The hub could not find that Wi-Fi network.',
  INVALID_SECURITY: 'The security setting does not match the network.',
  NO_ADDR: 'The hub joined the network but did not get an address from your router.',
  NO_INTERNET: 'The hub joined the network but could not reach the internet.',
  REFUSED: 'The hub refused the connection request. Make sure its Ethernet cable is plugged in.',
};

/** Why a WiFiConnect reply or WiFiConnectResult failed, for the form. */
export function connectFailureMessage(status: string | undefined): string {
  return (status && CONNECT_FAILURE_MESSAGES[status]) || WIFI_CONNECT_FAILED_MESSAGE;
}
