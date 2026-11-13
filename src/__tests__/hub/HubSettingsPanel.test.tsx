import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Hub, HubNetwork, HubWiFi } from '@arcus/core';
import { HubSettingsPanel } from '@/components/hub/HubSettingsPanel';
import type { HubData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockCloseRight = jest.fn();
let mockHub: HubData | null = null;
let mockScanEnabled = true;

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: any) => any) => sel({ hub: { hub: mockHub } }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/lib/hubWifi', () => ({
  ...jest.requireActual('@/lib/hubWifi'),
  isHubWifiScanEnabled: () => mockScanEnabled,
}));

// The name field and Wi-Fi configurator have their own tests.
jest.mock('@/components/hub/HubNameField', () => ({
  HubNameField: ({ address, name }: { address: string; name: string }) => (
    <div data-testid="name-field-mock">{`${address}|${name}`}</div>
  ),
}));

jest.mock('@/components/hub/HubWifiConfigurator', () => ({
  HubWifiConfigurator: ({ autoScan }: { autoScan?: boolean }) => (
    <div data-testid="wifi-configurator-mock">{autoScan ? 'auto' : 'manual'}</div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:ABC-1234:hub';

function makeHub(overrides: Partial<HubData> = {}): HubData {
  return {
    [Base.ATTR_ADDRESS]: HUB_ADDRESS,
    [Base.ATTR_CAPS]: [Base.NAMESPACE, Hub.NAMESPACE, HubNetwork.NAMESPACE, HubWiFi.NAMESPACE],
    [Hub.ATTR_NAME]: 'Home Hub',
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [HubNetwork.ATTR_TYPE]: HubNetwork.TYPE_ETH,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHub = makeHub();
  mockScanEnabled = true;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubSettingsPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HubSettingsPanel />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the name field, connection and Wi-Fi setup', () => {
    render(<HubSettingsPanel />);
    expect(screen.getByTestId('name-field-mock')).toHaveTextContent(`${HUB_ADDRESS}|Home Hub`);
    expect(screen.getByTestId('hub-settings-connection')).toHaveTextContent('Ethernet');
    expect(screen.getByTestId('wifi-configurator-mock')).toHaveTextContent('manual');
    expect(screen.queryByTestId('hub-settings-ssid')).not.toBeInTheDocument();
  });

  it('shows the configured Wi-Fi network', () => {
    mockHub = makeHub({ [HubNetwork.ATTR_TYPE]: HubNetwork.TYPE_WIFI, [HubWiFi.ATTR_WIFISSID]: 'HomeNet' });
    render(<HubSettingsPanel />);
    expect(screen.getByTestId('hub-settings-connection')).toHaveTextContent('Wi-Fi');
    expect(screen.getByTestId('hub-settings-ssid')).toHaveTextContent('HomeNet');
  });

  it('passes autoScan to the Wi-Fi configurator', () => {
    render(<HubSettingsPanel autoScan />);
    expect(screen.getByTestId('wifi-configurator-mock')).toHaveTextContent('auto');
  });

  it('hides Wi-Fi setup when ARCUS_ENABLE_HUB_WIFI_SCAN is off', () => {
    mockScanEnabled = false;
    render(<HubSettingsPanel />);
    expect(screen.queryByTestId('wifi-configurator-mock')).not.toBeInTheDocument();
    expect(screen.getByTestId('name-field-mock')).toBeInTheDocument();
  });

  it('hides Wi-Fi setup for a hub without Wi-Fi', () => {
    mockHub = makeHub({ [Base.ATTR_CAPS]: [Base.NAMESPACE, Hub.NAMESPACE], [HubWiFi.ATTR_WIFISSID]: 'Stale' });
    render(<HubSettingsPanel />);
    expect(screen.queryByTestId('wifi-configurator-mock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hub-settings-ssid')).not.toBeInTheDocument();
  });

  it('shows no connection for an offline hub, and Unknown for an unreported one', () => {
    mockHub = makeHub({ [Hub.ATTR_STATE]: Hub.STATE_DOWN });
    const { unmount } = render(<HubSettingsPanel />);
    expect(screen.getByTestId('hub-settings-connection')).toHaveTextContent('No Connection');
    unmount();

    mockHub = makeHub({ [HubNetwork.ATTR_TYPE]: undefined });
    render(<HubSettingsPanel />);
    expect(screen.getByTestId('hub-settings-connection')).toHaveTextContent('Unknown');
  });

  it('closes on Done', () => {
    render(<HubSettingsPanel />);
    fireEvent.click(screen.getByTestId('hub-settings-done'));
    expect(mockCloseRight).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('reminds to unplug Ethernet on Done when Wi-Fi is set up but the hub is still on Ethernet', () => {
    mockHub = makeHub({ [HubWiFi.ATTR_WIFISSID]: 'HomeNet' });
    render(<HubSettingsPanel />);
    fireEvent.click(screen.getByTestId('hub-settings-done'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'info', message: 'Please unplug the Ethernet cable to complete Wi-Fi setup.' },
    });
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('explains when there is no hub', () => {
    mockHub = null;
    render(<HubSettingsPanel />);
    expect(screen.getByTestId('hub-settings-no-hub')).toBeInTheDocument();
    expect(screen.queryByTestId('hub-settings-done')).not.toBeInTheDocument();
  });
});
