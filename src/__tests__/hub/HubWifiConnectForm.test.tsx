import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Hub, HubWiFi } from '@arcus/core';
import { HubWifiConnectForm } from '@/components/hub/HubWifiConnectForm';
import { WIFI_CONNECT_FAILED_MESSAGE, type WifiNetwork } from '@/lib/hubWifi';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
const corneaListeners: Record<string, Array<(...args: any[]) => void>> = {};

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

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:ABC-1234:hub';
const CONNECT_RESULT = `${Hub.NAMESPACE} ${HubWiFi.EVENT_WIFICONNECTRESULT}`;
const mockConnected = jest.fn();
const mockCancel = jest.fn();

const WPA2: WifiNetwork = { ssid: 'HomeNet', bssid: 'aa:01', securities: [HubWiFi.WIFISECURITY_WPA2_PSK], signal: 90 };
const OPEN: WifiNetwork = { ssid: 'CoffeeShop', bssid: 'aa:02', securities: [HubWiFi.WIFISECURITY_NONE], signal: 40 };
const MIXED: WifiNetwork = {
  ssid: 'Mixed', bssid: 'aa:03', securities: [HubWiFi.WIFISECURITY_WPA_PSK, HubWiFi.WIFISECURITY_WPA2_PSK], signal: 60,
};

function renderForm(network: WifiNetwork | null = WPA2) {
  return render(
    <HubWifiConnectForm hubAddress={HUB_ADDRESS} network={network} onConnected={mockConnected} onCancel={mockCancel} />,
  );
}

function emitConnectResult(status: string, address = HUB_ADDRESS) {
  act(() => {
    (corneaListeners[CONNECT_RESULT] ?? []).forEach((l) => l({ [Base.ATTR_ADDRESS]: address, status }));
  });
}

function enterPassword(value = 'secret123') {
  fireEvent.change(screen.getByTestId('hub-wifi-password'), { target: { value } });
}

async function connect() {
  fireEvent.click(screen.getByTestId('hub-wifi-connect'));
  await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalled());
  await act(() => mockBridgeRequest.mock.results[0].value.catch(() => {}));
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(corneaListeners)) delete corneaListeners[key];
  mockBridgeRequest.mockResolvedValue({ status: 'CONNECTING' });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubWifiConnectForm – rendering', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderForm();
    expect(asFragment()).toMatchSnapshot();
  });

  it('asks only for the password of a scanned WPA2 network', () => {
    renderForm();
    expect(screen.getByTestId('hub-wifi-chosen-network')).toHaveTextContent('HomeNet');
    expect(screen.getByLabelText('Wi-Fi Network Password')).toHaveAttribute('type', 'password');
    expect(screen.queryByTestId('hub-wifi-ssid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hub-wifi-security')).not.toBeInTheDocument();
  });

  it('asks for no password on an open network', () => {
    renderForm(OPEN);
    expect(screen.queryByTestId('hub-wifi-password')).not.toBeInTheDocument();
  });

  it('offers the security setting, defaulting to WPA2, when the network has several', () => {
    renderForm(MIXED);
    expect(screen.getByTestId('hub-wifi-security')).toHaveValue(HubWiFi.WIFISECURITY_WPA2_PSK);
  });

  it('asks for the name and security of another network', () => {
    renderForm(null);
    expect(screen.getByTestId('hub-wifi-chosen-network')).toHaveTextContent('Other');
    expect(screen.getByTestId('hub-wifi-ssid')).toBeInTheDocument();
    expect(screen.getByTestId('hub-wifi-security')).toHaveValue(HubWiFi.WIFISECURITY_WPA2_PSK);
  });

  it('hides the password when the security is changed to none', () => {
    renderForm(null);
    fireEvent.change(screen.getByTestId('hub-wifi-security'), { target: { value: HubWiFi.WIFISECURITY_NONE } });
    expect(screen.queryByTestId('hub-wifi-password')).not.toBeInTheDocument();
  });
});

describe('HubWifiConnectForm – validation', () => {
  it('requires the password for a secured network', () => {
    renderForm();
    fireEvent.click(screen.getByTestId('hub-wifi-connect'));
    expect(screen.getByTestId('hub-wifi-password-error')).toHaveTextContent('Enter the network password.');
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('requires a network name for another network', () => {
    renderForm(null);
    fireEvent.change(screen.getByTestId('hub-wifi-ssid'), { target: { value: '   ' } });
    enterPassword();
    fireEvent.click(screen.getByTestId('hub-wifi-connect'));
    expect(screen.getByTestId('hub-wifi-ssid-error')).toHaveTextContent('Enter the network name.');
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});

describe('HubWifiConnectForm – connecting', () => {
  it('sends WiFiConnect with the network, its BSSID, security and password', async () => {
    renderForm();
    enterPassword();
    await connect();

    expect(mockBridgeRequest).toHaveBeenCalledWith(HubWiFi.CMD_WIFICONNECT, HUB_ADDRESS, {
      ssid: 'HomeNet',
      bssid: 'aa:01',
      security: HubWiFi.WIFISECURITY_WPA2_PSK,
      key: 'secret123',
    });
  });

  it('sends no key for an open network', async () => {
    renderForm(OPEN);
    await connect();
    expect(mockBridgeRequest).toHaveBeenCalledWith(HubWiFi.CMD_WIFICONNECT, HUB_ADDRESS, {
      ssid: 'CoffeeShop',
      bssid: 'aa:02',
      security: HubWiFi.WIFISECURITY_NONE,
    });
  });

  it('sends the trimmed name and chosen security, without a BSSID, for another network', async () => {
    renderForm(null);
    fireEvent.change(screen.getByTestId('hub-wifi-ssid'), { target: { value: ' Hidden ' } });
    fireEvent.change(screen.getByTestId('hub-wifi-security'), { target: { value: HubWiFi.WIFISECURITY_WEP } });
    enterPassword('wepkey');
    await connect();
    expect(mockBridgeRequest).toHaveBeenCalledWith(HubWiFi.CMD_WIFICONNECT, HUB_ADDRESS, {
      ssid: 'Hidden',
      security: HubWiFi.WIFISECURITY_WEP,
      key: 'wepkey',
    });
  });

  it('waits for the connect result while the hub tests the network', async () => {
    renderForm();
    enterPassword();
    await connect();
    expect(screen.getByTestId('hub-wifi-connect')).toHaveTextContent('Connecting…');
    expect(screen.getByTestId('hub-wifi-connect')).toBeDisabled();
    expect(screen.getByTestId('hub-wifi-password')).toBeDisabled();
    expect(mockConnected).not.toHaveBeenCalled();
  });

  it('reports success when the hub connects', async () => {
    renderForm();
    enterPassword();
    await connect();
    emitConnectResult('OK');

    expect(mockConnected).toHaveBeenCalledWith('HomeNet');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Hub connected to HomeNet.' },
    });
  });

  it('explains a failed connection and offers to try again', async () => {
    renderForm();
    enterPassword();
    await connect();
    emitConnectResult('BAD_PASSWD');

    expect(screen.getByTestId('hub-wifi-connect-error')).toHaveTextContent('The Wi-Fi password is incorrect.');
    expect(screen.getByTestId('hub-wifi-connect')).toHaveTextContent('Try Again');
    expect(screen.getByTestId('hub-wifi-connect')).toBeEnabled();
    expect(mockConnected).not.toHaveBeenCalled();
  });

  it('shows the refusal when the hub will not try the network', async () => {
    mockBridgeRequest.mockResolvedValueOnce({ status: 'INVALID_KEY' });
    renderForm();
    enterPassword();
    await connect();

    expect(screen.getByTestId('hub-wifi-connect-error')).toHaveTextContent('not valid for this network');
    expect(screen.getByTestId('hub-wifi-connect')).toBeEnabled();
    // A late result for a refused attempt is ignored.
    emitConnectResult('OK');
    expect(mockConnected).not.toHaveBeenCalled();
  });

  it('shows an error and notification when the request fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    renderForm();
    enterPassword();
    await connect();

    expect(screen.getByTestId('hub-wifi-connect-error')).toHaveTextContent(WIFI_CONNECT_FAILED_MESSAGE);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to connect the hub to Wi-Fi.' },
    });
  });

  it('ignores results from another hub and results nobody asked for', async () => {
    renderForm();
    emitConnectResult('OK');
    expect(mockConnected).not.toHaveBeenCalled();

    enterPassword();
    await connect();
    emitConnectResult('OK', 'SERV:OTHER-0000:hub');
    expect(mockConnected).not.toHaveBeenCalled();
  });

  it('cancels, even while connecting', async () => {
    renderForm();
    enterPassword();
    await connect();
    fireEvent.click(screen.getByTestId('hub-wifi-cancel'));
    expect(mockCancel).toHaveBeenCalled();
  });

  it('stops listening once closed', () => {
    const { unmount } = renderForm();
    expect(corneaListeners[CONNECT_RESULT]).toHaveLength(1);
    unmount();
    expect(corneaListeners[CONNECT_RESULT]).toHaveLength(0);
  });
});
