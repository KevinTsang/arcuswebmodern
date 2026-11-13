import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Hub, HubNetwork, HubWiFi } from '@arcus/core';
import { HubWifiConfigurator } from '@/components/hub/HubWifiConfigurator';
import type { HubNetworkStatus, WifiNetwork, WifiScanResult } from '@/lib/hubWifi';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
const corneaListeners: Record<string, Array<(...args: any[]) => void>> = {};
let capturedFormProps: { network: WifiNetwork | null; onConnected: (ssid: string) => void; onCancel: () => void } | null;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@arcus/core/cornea', () => ({
  __esModule: true,
  default: {
    on: (event: string, listener: (...args: any[]) => void) => {
      (corneaListeners[event] ??= []).push(listener);
    },
    off: (event: string, listener: (...args: any[]) => void) => {
      corneaListeners[event] = (corneaListeners[event] ?? []).filter((l) => l !== listener);
    },
  },
}));

jest.mock('@/store/hooks', () => ({ useAppDispatch: () => mockDispatch }));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// The form has its own tests; capture what the configurator hands it.
jest.mock('@/components/hub/HubWifiConnectForm', () => ({
  HubWifiConnectForm: (props: any) => {
    capturedFormProps = props;
    return <div data-testid="connect-form-mock">{props.network?.ssid ?? 'other'}</div>;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:ABC-1234:hub';
const SCAN_RESULTS = `${Hub.NAMESPACE} ${HubWiFi.EVENT_WIFISCANRESULTS}`;

const RESULTS: WifiScanResult[] = [
  { ssid: 'CoffeeShop', bssid: 'aa:02', security: ['None'], signal: 30 },
  { ssid: 'HomeNet', bssid: 'aa:01', security: ['WPA2-PSK'], signal: 90 },
];

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

function emitScanResults(scanResults: WifiScanResult[] = RESULTS, address = HUB_ADDRESS) {
  act(() => {
    (corneaListeners[SCAN_RESULTS] ?? []).forEach((l) => l({ [Base.ATTR_ADDRESS]: address, scanResults }));
  });
}

async function scan() {
  fireEvent.click(screen.getByTestId('hub-wifi-scan'));
  await waitFor(() => expect(screen.getByTestId('hub-wifi-scan')).toHaveTextContent('Scanning…'));
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(corneaListeners)) delete corneaListeners[key];
  capturedFormProps = null;
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubWifiConfigurator – rendering', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HubWifiConfigurator status={status()} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('invites a first scan on Ethernet', () => {
    render(<HubWifiConfigurator status={status()} />);
    expect(screen.getByTestId('hub-wifi-title')).toHaveTextContent('Connect Hub to Wi-Fi');
    expect(screen.getByTestId('hub-wifi-summary')).toHaveTextContent('To get started, scan for available Wi-Fi networks');
    expect(screen.getByTestId('hub-wifi-scan')).toBeEnabled();
    expect(screen.queryByTestId('hub-wifi-ethernet-required')).not.toBeInTheDocument();
  });

  it('offers to update a configured network', () => {
    render(<HubWifiConfigurator status={status({ wifiSsid: 'HomeNet' })} />);
    expect(screen.getByTestId('hub-wifi-title')).toHaveTextContent('Update Wi-Fi');
    expect(screen.getByTestId('hub-wifi-summary')).toHaveTextContent('If you need to change Wi-Fi networks');
  });

  it('needs Ethernet to scan while on Wi-Fi', () => {
    render(<HubWifiConfigurator status={status({ connectionType: HubNetwork.TYPE_WIFI, wifiSsid: 'HomeNet' })} />);
    expect(screen.getByTestId('hub-wifi-scan')).toBeDisabled();
    expect(screen.getByTestId('hub-wifi-ethernet-required')).toBeInTheDocument();
  });

  it('explains cellular backup and does not scan on it', () => {
    render(<HubWifiConfigurator status={status({ connectionType: HubNetwork.TYPE_3G })} />);
    expect(screen.getByTestId('hub-wifi-title')).toHaveTextContent('Connect Hub to Ethernet or Wi-Fi');
    expect(screen.getByTestId('hub-wifi-summary')).toHaveTextContent('You are on Cellular Backup');
    expect(screen.getByTestId('hub-wifi-scan')).toBeDisabled();
  });

  it('explains an offline hub and offers no scan', () => {
    render(<HubWifiConfigurator status={status({ online: false, wifiSsid: 'HomeNet' })} />);
    expect(screen.getByTestId('hub-wifi-title')).toHaveTextContent('Connect Hub to Wi-Fi');
    expect(screen.getByTestId('hub-wifi-summary')).toHaveTextContent('Hub disconnected.');
    expect(screen.queryByTestId('hub-wifi-scan')).not.toBeInTheDocument();
  });
});

describe('HubWifiConfigurator – scanning', () => {
  it('starts a 30-second scan and shows the networks found, strongest first', async () => {
    render(<HubWifiConfigurator status={status()} />);
    await scan();
    expect(mockBridgeRequest).toHaveBeenCalledWith(HubWiFi.CMD_WIFISTARTSCAN, HUB_ADDRESS, { timeout: 30 });
    expect(screen.getByTestId('hub-wifi-scan')).toBeDisabled();

    emitScanResults();

    const buttons = screen.getAllByTestId(/^hub-wifi-network-(?!other)/);
    expect(buttons.map((b) => b.getAttribute('data-testid'))).toEqual([
      'hub-wifi-network-HomeNet',
      'hub-wifi-network-CoffeeShop',
    ]);
  });

  it('keeps the list up to date with later results of the same scan', async () => {
    render(<HubWifiConfigurator status={status()} />);
    await scan();
    emitScanResults();
    emitScanResults([...RESULTS, { ssid: 'Neighbor', security: ['WPA2-PSK'], signal: 50 }]);
    expect(screen.getByTestId('hub-wifi-network-Neighbor')).toBeInTheDocument();
  });

  it('shows an error and allows scanning again when the scan fails to start', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<HubWifiConfigurator status={status()} />);
    fireEvent.click(screen.getByTestId('hub-wifi-scan'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to scan for Wi-Fi networks. Make sure the hub is online.' },
    }));
    expect(screen.getByTestId('hub-wifi-scan')).toHaveTextContent('Scan');
    expect(screen.getByTestId('hub-wifi-scan')).toBeEnabled();
    // Results arriving after a failed start are not wanted.
    emitScanResults();
    expect(screen.queryByTestId('hub-wifi-network-HomeNet')).not.toBeInTheDocument();
  });

  it('ignores scan results it did not ask for, or from another hub', async () => {
    render(<HubWifiConfigurator status={status()} />);
    emitScanResults();
    expect(screen.queryByTestId('hub-wifi-network-HomeNet')).not.toBeInTheDocument();

    await scan();
    emitScanResults(RESULTS, 'SERV:OTHER-0000:hub');
    expect(screen.queryByTestId('hub-wifi-network-HomeNet')).not.toBeInTheDocument();
  });

  it('scans again from the network list', async () => {
    render(<HubWifiConfigurator status={status()} />);
    await scan();
    emitScanResults();
    fireEvent.click(screen.getByTestId('hub-wifi-rescan'));
    await waitFor(() => expect(screen.getByTestId('hub-wifi-scan')).toHaveTextContent('Scanning…'));
    expect(mockBridgeRequest).toHaveBeenCalledTimes(2);
  });

  it('scans straight away when opened from hub pairing', async () => {
    render(<HubWifiConfigurator status={status()} autoScan />);
    await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(HubWiFi.CMD_WIFISTARTSCAN, HUB_ADDRESS, { timeout: 30 }));
  });

  it('does not scan straight away for an offline hub', () => {
    render(<HubWifiConfigurator status={status({ online: false })} autoScan />);
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('ends the scan it started when closed', async () => {
    const { unmount } = render(<HubWifiConfigurator status={status()} />);
    await scan();
    unmount();
    expect(mockBridgeRequest).toHaveBeenCalledWith(HubWiFi.CMD_WIFIENDSCAN, HUB_ADDRESS, {});
  });

  it('sends nothing when closed without scanning, even if ending would fail', () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    const { unmount } = render(<HubWifiConfigurator status={status()} />);
    unmount();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});

describe('HubWifiConfigurator – choosing a network', () => {
  async function showNetworks() {
    render(<HubWifiConfigurator status={status()} />);
    await scan();
    emitScanResults();
  }

  it('opens the form for the chosen network', async () => {
    await showNetworks();
    fireEvent.click(screen.getByTestId('hub-wifi-network-HomeNet'));
    expect(screen.getByTestId('connect-form-mock')).toHaveTextContent('HomeNet');
    expect(capturedFormProps?.network).toEqual({
      ssid: 'HomeNet', bssid: 'aa:01', securities: [HubWiFi.WIFISECURITY_WPA2_PSK], signal: 90,
    });
  });

  it('opens the form for another network', async () => {
    await showNetworks();
    fireEvent.click(screen.getByTestId('hub-wifi-network-other'));
    expect(screen.getByTestId('connect-form-mock')).toHaveTextContent('other');
    expect(capturedFormProps?.network).toBeNull();
  });

  it('returns to the list on cancel', async () => {
    await showNetworks();
    fireEvent.click(screen.getByTestId('hub-wifi-network-HomeNet'));
    act(() => capturedFormProps?.onCancel());
    expect(screen.getByTestId('hub-wifi-network-HomeNet')).toBeInTheDocument();
  });

  it('goes back to the start once connected, and stops taking scan results', async () => {
    await showNetworks();
    fireEvent.click(screen.getByTestId('hub-wifi-network-HomeNet'));
    act(() => capturedFormProps?.onConnected('HomeNet'));
    expect(screen.getByTestId('hub-wifi-scan')).toBeInTheDocument();
    emitScanResults();
    expect(screen.queryByTestId('hub-wifi-network-HomeNet')).not.toBeInTheDocument();
  });
});
