import { render, screen, fireEvent } from '@testing-library/react';
import { isValidElement } from 'react';
import { Base, Hub, HubNetwork, HubWiFi } from '@arcus/core';
import HubWifiSetupPrompt from '@/components/pairing/HubWifiSetupPrompt';
import { HubSettingsPanel } from '@/components/hub/HubSettingsPanel';
import type { HubData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
let mockHub: HubData | null = null;
let mockScanEnabled = true;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ hub: { hub: mockHub } }),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/lib/hubWifi', () => ({
  ...jest.requireActual('@/lib/hubWifi'),
  isHubWifiScanEnabled: () => mockScanEnabled,
}));

jest.mock('@/components/hub/HubSettingsPanel', () => ({
  HubSettingsPanel: () => <div>HubSettingsPanel</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeHub(overrides: Partial<HubData> = {}): HubData {
  return {
    [Base.ATTR_ADDRESS]: 'SERV:ABC-1234:hub',
    [Base.ATTR_CAPS]: [Base.NAMESPACE, Hub.NAMESPACE, HubWiFi.NAMESPACE],
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [HubNetwork.ATTR_TYPE]: HubNetwork.TYPE_ETH,
    ...overrides,
  };
}

const CONFIGURED = {
  [HubWiFi.ATTR_WIFISSID]: 'HomeNet',
  [HubWiFi.ATTR_WIFISECURITY]: HubWiFi.WIFISECURITY_WPA2_PSK,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHub = makeHub();
  mockScanEnabled = true;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubWifiSetupPrompt', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HubWifiSetupPrompt />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('offers Wi-Fi setup for a Wi-Fi hub without a network', () => {
    render(<HubWifiSetupPrompt />);
    expect(screen.getByTestId('hub-wifi-setup-prompt')).toHaveTextContent(
      'To stay connected to the internet without an Ethernet cable, consider connecting the Hub to your Wi-Fi network.',
    );
  });

  it('opens hub settings with an automatic scan', () => {
    render(<HubWifiSetupPrompt />);
    fireEvent.click(screen.getByTestId('hub-wifi-setup-link'));

    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Hub Settings', key: 'hub-settings' });
    const content = mockOpenRight.mock.calls[0][0];
    expect(isValidElement(content) && content.type).toBe(HubSettingsPanel);
    expect(content.props).toEqual({ autoScan: true });
  });

  it('shows the configured network and asks to unplug Ethernet', () => {
    mockHub = makeHub(CONFIGURED);
    render(<HubWifiSetupPrompt />);
    expect(screen.getByTestId('hub-wifi-setup-connection')).toHaveTextContent('Ethernet');
    expect(screen.getByTestId('hub-wifi-setup-ssid')).toHaveTextContent('HomeNet');
    expect(screen.getByTestId('hub-wifi-setup-unplug')).toBeInTheDocument();
    expect(screen.queryByTestId('hub-wifi-setup-link')).not.toBeInTheDocument();
  });

  it('does not ask to unplug once the hub is on Wi-Fi', () => {
    mockHub = makeHub({ ...CONFIGURED, [HubNetwork.ATTR_TYPE]: HubNetwork.TYPE_WIFI });
    render(<HubWifiSetupPrompt />);
    expect(screen.getByTestId('hub-wifi-setup-connection')).toHaveTextContent('Wi-Fi');
    expect(screen.queryByTestId('hub-wifi-setup-unplug')).not.toBeInTheDocument();
  });

  it('renders nothing when ARCUS_ENABLE_HUB_WIFI_SCAN is off', () => {
    mockScanEnabled = false;
    const { container } = render(<HubWifiSetupPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a hub without Wi-Fi', () => {
    mockHub = makeHub({ [Base.ATTR_CAPS]: [Base.NAMESPACE, Hub.NAMESPACE] });
    const { container } = render(<HubWifiSetupPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing before the hub is loaded', () => {
    mockHub = null;
    const { container } = render(<HubWifiSetupPrompt />);
    expect(container).toBeEmptyDOMElement();
  });
});
