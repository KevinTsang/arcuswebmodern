import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Hub, HubZwave } from '@arcus/core';
import { ZWaveNetworkCard } from '@/components/hub/ZWaveNetworkCard';
import type { HubAdvancedAttributes, ZWaveNetworkInformation } from '@/components/hub/hubAdvancedTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:LWF-1234:hub';

function makeHub(overrides: Partial<HubAdvancedAttributes> = {}): HubAdvancedAttributes {
  return {
    [Base.ATTR_ADDRESS]: HUB_ADDRESS,
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [HubZwave.ATTR_NUMDEVICES]: 3,
    [HubZwave.ATTR_HOMEID]: 'E1A2B3C4',
    [HubZwave.ATTR_STATE]: HubZwave.STATE_NORMAL,
    [HubZwave.ATTR_FIRMWARE]: '6.81',
    [HubZwave.ATTR_PROTOCOL]: '4.61',
    [HubZwave.ATTR_ISSUC]: true,
    [HubZwave.ATTR_ISSECONDARY]: false,
    [HubZwave.ATTR_HEALINPROGRESS]: false,
    ...overrides,
  };
}

const NETWORK: ZWaveNetworkInformation = {
  metrics: { 2: { rssi: -60, txFailures: 1 } },
  neighbors: { 2: [1, 3], 3: [2] },
  route: { 3: [2] },
  routing: { 2: [1, 3] },
  zombies: [],
};

const LOAD_ERROR = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Failed to load Z-Wave network information' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue(NETWORK);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ZWaveNetworkCard', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ZWaveNetworkCard hub={makeHub()} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the controller attributes', () => {
      render(<ZWaveNetworkCard hub={makeHub()} />);
      expect(screen.getByTestId('hub-zwave-value-devices')).toHaveTextContent('3');
      expect(screen.getByTestId('hub-zwave-value-home-id')).toHaveTextContent('E1A2B3C4');
      expect(screen.getByTestId('hub-zwave-value-firmware')).toHaveTextContent('6.81');
      expect(screen.getByTestId('hub-zwave-value-static-update-controller')).toHaveTextContent('Yes');
      expect(screen.getByTestId('hub-zwave-value-secondary-controller')).toHaveTextContent('No');
      expect(screen.getByTestId('hub-zwave-value-network-rebuild')).toHaveTextContent('Never rebuilt');
    });

    it('shows rebuild progress and the recommendation', () => {
      render(<ZWaveNetworkCard hub={makeHub({
        [HubZwave.ATTR_HEALINPROGRESS]: true,
        [HubZwave.ATTR_HEALPERCENT]: 0.42,
        [HubZwave.ATTR_HEALRECOMMENDED]: true,
      })} />);
      expect(screen.getByTestId('hub-zwave-value-network-rebuild')).toHaveTextContent('In progress (42%)');
      expect(screen.getByTestId('hub-zwave-heal-recommended')).toBeInTheDocument();
    });

    it('shows when the network was last rebuilt', () => {
      const finished = new Date('2026-01-02T03:04:05Z').getTime();
      render(<ZWaveNetworkCard hub={makeHub({ [HubZwave.ATTR_HEALLASTFINISH]: finished })} />);
      expect(screen.getByTestId('hub-zwave-value-network-rebuild'))
        .toHaveTextContent(`Last rebuilt ${new Date(finished).toLocaleString()}`);
    });
  });

  describe('network topology', () => {
    it('loads NetworkInformation from the hub and shows the nodes', async () => {
      render(<ZWaveNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zwave-load'));
      expect(await screen.findByTestId('zwave-node-2')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(HubZwave.CMD_NETWORKINFORMATION, HUB_ADDRESS, {});
      expect(screen.getByTestId('zwave-node-3-route')).toHaveTextContent('2');
      expect(screen.getByTestId('hub-zwave-load')).toHaveTextContent('Refresh Network Topology');
      expect(screen.queryByTestId('hub-zwave-zombies')).not.toBeInTheDocument();
    });

    it('shows Analyzing while the request is in flight', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<ZWaveNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zwave-load'));
      await waitFor(() => expect(screen.getByTestId('hub-zwave-load')).toBeDisabled());
      expect(screen.getByTestId('hub-zwave-load')).toHaveTextContent('Analyzing network...');
    });

    it('lists zombie nodes', async () => {
      mockBridgeRequest.mockResolvedValueOnce({ ...NETWORK, zombies: [7, 9] });
      render(<ZWaveNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zwave-load'));
      expect(await screen.findByTestId('hub-zwave-zombies')).toHaveTextContent('7, 9');
    });

    it('shows an error when the request fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('timeout'));
      render(<ZWaveNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zwave-load'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(LOAD_ERROR));
      expect(screen.queryByTestId('hub-zwave-topology')).not.toBeInTheDocument();
      expect(screen.getByTestId('hub-zwave-load')).not.toBeDisabled();
    });

    it('handles an empty response', async () => {
      mockBridgeRequest.mockResolvedValueOnce(undefined);
      render(<ZWaveNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zwave-load'));
      expect(await screen.findByTestId('zwave-nodes-empty')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('disables loading while the hub is offline', () => {
      render(<ZWaveNetworkCard hub={makeHub({ [Hub.ATTR_STATE]: Hub.STATE_DOWN })} />);
      expect(screen.getByTestId('hub-zwave-load')).toBeDisabled();
      expect(screen.getByTestId('hub-zwave-offline')).toBeInTheDocument();
    });

    it('shows dashes for missing attributes', () => {
      render(<ZWaveNetworkCard hub={{ [Base.ATTR_ADDRESS]: HUB_ADDRESS }} />);
      expect(screen.getByTestId('hub-zwave-value-devices')).toHaveTextContent('0');
      expect(screen.getByTestId('hub-zwave-value-home-id')).toHaveTextContent('-');
      expect(screen.getByTestId('hub-zwave-value-static-update-controller')).toHaveTextContent('-');
    });
  });
});
