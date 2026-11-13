import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Hub, HubZigbee } from '@arcus/core';
import { ZigbeeNetworkCard } from '@/components/hub/ZigbeeNetworkCard';
import type { HubAdvancedAttributes } from '@/components/hub/hubAdvancedTypes';

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
    [HubZigbee.ATTR_CHANNEL]: 20,
    [HubZigbee.ATTR_PANID]: 0x1a2b,
    [HubZigbee.ATTR_POWER]: 8,
    [HubZigbee.ATTR_POWERMODE]: HubZigbee.POWERMODE_BOOST,
    [HubZigbee.ATTR_STATE]: HubZigbee.STATE_UP,
    [HubZigbee.ATTR_VERSION]: '6.4.1',
    ...overrides,
  };
}

const STATS = { macRxBcast: 120, macTxUcastFail: 3, apsRxBcast: 40 };

const LOAD_ERROR = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Failed to load Zigbee radio statistics' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({ stats: STATS });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ZigbeeNetworkCard', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ZigbeeNetworkCard hub={makeHub()} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the channel and radio settings', () => {
      render(<ZigbeeNetworkCard hub={makeHub()} />);
      expect(screen.getByTestId('hub-zigbee-value-channel')).toHaveTextContent('20');
      expect(screen.getByTestId('hub-zigbee-value-pan-id')).toHaveTextContent('0x1A2B');
      expect(screen.getByTestId('hub-zigbee-value-transmit-power')).toHaveTextContent('8 dBm');
      expect(screen.getByTestId('hub-zigbee-value-power-mode')).toHaveTextContent('BOOST');
      expect(screen.getByTestId('hub-zigbee-value-network-state')).toHaveTextContent('UP');
      expect(screen.getByTestId('hub-zigbee-value-radio-firmware')).toHaveTextContent('6.4.1');
    });
  });

  describe('radio statistics', () => {
    it('loads GetStats from the hub and lists the counters alphabetically', async () => {
      render(<ZigbeeNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zigbee-load'));
      expect(await screen.findByTestId('hub-zigbee-stats')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(HubZigbee.CMD_GETSTATS, HUB_ADDRESS, {});
      expect(screen.getByTestId('hub-zigbee-stat-mactxucastfail')).toHaveTextContent('3');
      const names = screen.getAllByRole('term').map((t) => t.textContent);
      expect(names).toEqual(['apsRxBcast', 'macRxBcast', 'macTxUcastFail']);
      expect(screen.getByTestId('hub-zigbee-load')).toHaveTextContent('Refresh Radio Statistics');
    });

    it('shows Loading while the request is in flight', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<ZigbeeNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zigbee-load'));
      await waitFor(() => expect(screen.getByTestId('hub-zigbee-load')).toBeDisabled());
      expect(screen.getByTestId('hub-zigbee-load')).toHaveTextContent('Loading...');
    });

    it('shows an error when the request fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<ZigbeeNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zigbee-load'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(LOAD_ERROR));
      expect(screen.queryByTestId('hub-zigbee-stats')).not.toBeInTheDocument();
    });

    it('shows an empty message when the hub reports no counters', async () => {
      mockBridgeRequest.mockResolvedValueOnce({});
      render(<ZigbeeNetworkCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-zigbee-load'));
      expect(await screen.findByTestId('hub-zigbee-stats-empty')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('disables loading while the hub is offline', () => {
      render(<ZigbeeNetworkCard hub={makeHub({ [Hub.ATTR_STATE]: Hub.STATE_DOWN })} />);
      expect(screen.getByTestId('hub-zigbee-load')).toBeDisabled();
      expect(screen.getByTestId('hub-zigbee-offline')).toBeInTheDocument();
    });

    it('shows dashes for missing attributes', () => {
      render(<ZigbeeNetworkCard hub={{ [Base.ATTR_ADDRESS]: HUB_ADDRESS }} />);
      expect(screen.getByTestId('hub-zigbee-value-channel')).toHaveTextContent('-');
      expect(screen.getByTestId('hub-zigbee-value-pan-id')).toHaveTextContent('-');
      expect(screen.getByTestId('hub-zigbee-value-transmit-power')).toHaveTextContent('-');
    });
  });
});
