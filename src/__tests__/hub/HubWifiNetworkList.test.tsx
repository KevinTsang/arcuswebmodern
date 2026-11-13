import { render, screen, fireEvent } from '@testing-library/react';
import { HubWiFi } from '@arcus/core';
import { HubWifiNetworkList } from '@/components/hub/HubWifiNetworkList';
import type { WifiNetwork } from '@/lib/hubWifi';

// ── Helpers ───────────────────────────────────────────────────────────

const mockSelect = jest.fn();
const mockOther = jest.fn();

const NETWORKS: WifiNetwork[] = [
  { ssid: 'HomeNet', bssid: 'aa:01', securities: [HubWiFi.WIFISECURITY_WPA2_PSK], signal: 90 },
  { ssid: 'CoffeeShop', bssid: 'aa:02', securities: [HubWiFi.WIFISECURITY_NONE], signal: 30 },
];

function renderList(networks = NETWORKS, currentSsid = '') {
  return render(
    <HubWifiNetworkList networks={networks} currentSsid={currentSsid} onSelect={mockSelect} onOther={mockOther} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubWifiNetworkList', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderList(NETWORKS, 'HomeNet');
    expect(asFragment()).toMatchSnapshot();
  });

  it('lists each network with its signal and a lock for secured networks', () => {
    renderList();
    expect(screen.getByTestId('hub-wifi-network-HomeNet')).toHaveTextContent('HomeNet');
    expect(screen.getByTestId('hub-wifi-signal-HomeNet')).toHaveAttribute('aria-label', 'Signal 4 of 4');
    expect(screen.getByTestId('hub-wifi-signal-CoffeeShop')).toHaveAttribute('aria-label', 'Signal 1 of 4');
    expect(screen.getAllByLabelText('Secured')).toHaveLength(1);
  });

  it('marks the hub\'s current network', () => {
    renderList(NETWORKS, 'HomeNet');
    expect(screen.getByTestId('hub-wifi-network-HomeNet')).toHaveTextContent('Current');
    expect(screen.getByTestId('hub-wifi-network-CoffeeShop')).not.toHaveTextContent('Current');
  });

  it('selects a network', () => {
    renderList();
    fireEvent.click(screen.getByTestId('hub-wifi-network-CoffeeShop'));
    expect(mockSelect).toHaveBeenCalledWith(NETWORKS[1]);
  });

  it('offers joining another network', () => {
    renderList();
    fireEvent.click(screen.getByTestId('hub-wifi-network-other'));
    expect(mockOther).toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('explains when the scan found nothing, and still offers another network', () => {
    renderList([]);
    expect(screen.getByTestId('hub-wifi-no-networks')).toBeInTheDocument();
    expect(screen.getByTestId('hub-wifi-network-other')).toBeInTheDocument();
  });
});
