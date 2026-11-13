import { Base, Hub, HubNetwork, HubWiFi } from '@arcus/core';
import {
  WIFI_CONNECT_FAILED_MESSAGE,
  connectFailureMessage,
  connectionLabel,
  hasConfiguredWifi,
  isHubWifiScanEnabled,
  normalizeSecurity,
  preferredSecurity,
  readHubNetworkStatus,
  signalBars,
  toNetworks,
  type HubNetworkStatus,
} from '@/lib/hubWifi';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockGetConfig = jest.fn();

jest.mock('@arcus/core/config', () => ({ getConfig: () => mockGetConfig() }));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:ABC-1234:hub';

function status(overrides: Partial<HubNetworkStatus> = {}): HubNetworkStatus {
  return {
    address: HUB_ADDRESS,
    name: 'Home Hub',
    online: true,
    connectionType: HubNetwork.TYPE_ETH,
    wifiCapable: true,
    wifiSsid: '',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('isHubWifiScanEnabled', () => {
  it('follows the config flag', () => {
    mockGetConfig.mockReturnValueOnce({ enableHubWifiScan: true });
    expect(isHubWifiScanEnabled()).toBe(true);
    mockGetConfig.mockReturnValueOnce({ enableHubWifiScan: false });
    expect(isHubWifiScanEnabled()).toBe(false);
  });

  it('is off before the config is loaded', () => {
    mockGetConfig.mockImplementationOnce(() => {
      throw new Error('Config not initialized');
    });
    expect(isHubWifiScanEnabled()).toBe(false);
  });
});

describe('readHubNetworkStatus', () => {
  it('reads the hub network and Wi-Fi attributes', () => {
    expect(readHubNetworkStatus({
      [Base.ATTR_ADDRESS]: HUB_ADDRESS,
      [Base.ATTR_CAPS]: [Base.NAMESPACE, Hub.NAMESPACE, HubWiFi.NAMESPACE],
      [Hub.ATTR_NAME]: 'Home Hub',
      [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
      [HubNetwork.ATTR_TYPE]: HubNetwork.TYPE_WIFI,
      [HubWiFi.ATTR_WIFISSID]: 'HomeNet',
      [HubWiFi.ATTR_WIFISECURITY]: HubWiFi.WIFISECURITY_WPA2_PSK,
      [HubWiFi.ATTR_WIFIRSSI]: -60,
    })).toEqual({
      address: HUB_ADDRESS,
      name: 'Home Hub',
      online: true,
      connectionType: HubNetwork.TYPE_WIFI,
      wifiCapable: true,
      wifiSsid: 'HomeNet',
      wifiSecurity: HubWiFi.WIFISECURITY_WPA2_PSK,
      wifiRssi: -60,
    });
  });

  it('treats a hub without a state, or DOWN, as offline and without Wi-Fi when it lacks the capability', () => {
    const bare = readHubNetworkStatus({ [Base.ATTR_ADDRESS]: HUB_ADDRESS });
    expect(bare).toMatchObject({ online: false, wifiCapable: false, wifiSsid: '', name: '' });
    expect(readHubNetworkStatus({ [Base.ATTR_ADDRESS]: HUB_ADDRESS, [Hub.ATTR_STATE]: Hub.STATE_DOWN }).online).toBe(false);
    expect(readHubNetworkStatus({ [Base.ATTR_ADDRESS]: HUB_ADDRESS, [Hub.ATTR_STATE]: Hub.STATE_PAIRING }).online).toBe(true);
  });
});

describe('connectionLabel', () => {
  it.each([
    [HubNetwork.TYPE_ETH, 'Ethernet'],
    [HubNetwork.TYPE_WIFI, 'Wi-Fi'],
    [HubNetwork.TYPE_3G, 'Cellular Backup'],
    [undefined, ''],
  ])('labels %s as "%s"', (type, label) => {
    expect(connectionLabel(status({ connectionType: type }))).toBe(label);
  });

  it('reports no connection for an offline hub', () => {
    expect(connectionLabel(status({ online: false }))).toBe('No Connection');
  });
});

describe('hasConfiguredWifi', () => {
  it('needs an SSID and a known security', () => {
    expect(hasConfiguredWifi(status({ wifiSsid: 'HomeNet', wifiSecurity: HubWiFi.WIFISECURITY_NONE }))).toBe(true);
    expect(hasConfiguredWifi(status({ wifiSsid: 'HomeNet' }))).toBe(false);
    expect(hasConfiguredWifi(status({ wifiSsid: 'HomeNet', wifiSecurity: 'BOGUS' }))).toBe(false);
    expect(hasConfiguredWifi(status({ wifiSecurity: HubWiFi.WIFISECURITY_WPA2_PSK }))).toBe(false);
  });
});

describe('security helpers', () => {
  it('normalizes scan securities to the WiFiConnect form', () => {
    expect(normalizeSecurity('WPA2-PSK')).toBe(HubWiFi.WIFISECURITY_WPA2_PSK);
    expect(normalizeSecurity('wpa-enterprise')).toBe(HubWiFi.WIFISECURITY_WPA_ENTERPRISE);
    expect(normalizeSecurity('None')).toBe(HubWiFi.WIFISECURITY_NONE);
  });

  it('prefers WPA2 PSK, then the first security, then none', () => {
    expect(preferredSecurity([HubWiFi.WIFISECURITY_WPA_PSK, HubWiFi.WIFISECURITY_WPA2_PSK])).toBe(HubWiFi.WIFISECURITY_WPA2_PSK);
    expect(preferredSecurity([HubWiFi.WIFISECURITY_WEP])).toBe(HubWiFi.WIFISECURITY_WEP);
    expect(preferredSecurity([])).toBe(HubWiFi.WIFISECURITY_NONE);
  });
});

describe('toNetworks', () => {
  it('drops hidden networks, keeps each SSID once at its strongest, and sorts strongest first', () => {
    expect(toNetworks([
      { ssid: 'Weak', bssid: 'aa:01', security: ['None'], signal: 20 },
      { ssid: '', bssid: 'aa:02', security: ['WPA2-PSK'], signal: 99 },
      { ssid: 'Home', bssid: 'aa:03', security: ['WPA-PSK', 'WPA2-PSK'], signal: 50 },
      { ssid: 'Home', bssid: 'aa:04', security: ['WPA2-PSK'], signal: 90 },
      { ssid: 'Home', bssid: 'aa:05', security: ['WPA2-PSK'], signal: 10 },
      { ssid: 'NoSignal' },
    ])).toEqual([
      { ssid: 'Home', bssid: 'aa:04', securities: [HubWiFi.WIFISECURITY_WPA2_PSK], signal: 90 },
      { ssid: 'Weak', bssid: 'aa:01', securities: [HubWiFi.WIFISECURITY_NONE], signal: 20 },
      { ssid: 'NoSignal', bssid: undefined, securities: [], signal: 0 },
    ]);
  });

  it('returns no networks for a missing result list', () => {
    expect(toNetworks(undefined)).toEqual([]);
  });
});

describe('signalBars', () => {
  it.each([
    [0, 0], [20, 0], [21, 1], [40, 1], [41, 2], [60, 2], [61, 3], [79, 3], [80, 4], [100, 4],
    [-101, 0], [-100, 1], [-86, 1], [-85, 2], [-71, 2], [-70, 3], [-56, 3], [-55, 4], [-30, 4],
  ])('shows %d as %d bars', (signal, bars) => {
    expect(signalBars(signal)).toBe(bars);
  });
});

describe('connectFailureMessage', () => {
  it('explains the statuses the hub reports', () => {
    expect(connectFailureMessage('BAD_PASSWD')).toBe('The Wi-Fi password is incorrect.');
    expect(connectFailureMessage('NO_INTERNET')).toMatch(/could not reach the internet/);
    expect(connectFailureMessage('REFUSED')).toMatch(/refused/);
  });

  it('falls back to the general message', () => {
    expect(connectFailureMessage(undefined)).toBe(WIFI_CONNECT_FAILED_MESSAGE);
    expect(connectFailureMessage('SOMETHING_NEW')).toBe(WIFI_CONNECT_FAILED_MESSAGE);
  });
});
