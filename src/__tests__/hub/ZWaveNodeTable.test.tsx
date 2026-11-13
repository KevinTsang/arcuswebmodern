import { render, screen } from '@testing-library/react';
import { ZWaveNodeTable } from '@/components/hub/ZWaveNodeTable';
import type { ZWaveNetworkInformation } from '@/components/hub/hubAdvancedTypes';

// ── Helpers ───────────────────────────────────────────────────────────

const NETWORK: ZWaveNetworkInformation = {
  metrics: { 2: { rssi: -60, txFailures: 1 }, 10: { rssi: -80 } },
  neighbors: { 2: [1, 10], 10: [2] },
  route: { 10: [2] },
  routing: { 2: [1, 10] },
};

// ── Tests ─────────────────────────────────────────────────────────────

describe('ZWaveNodeTable', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ZWaveNodeTable info={NETWORK} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('renders one row per node, in numeric order', () => {
      render(<ZWaveNodeTable info={NETWORK} />);
      const rows = screen.getAllByTestId(/^zwave-node-\d+$/);
      expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual(['zwave-node-2', 'zwave-node-10']);
    });

    it('formats metrics, neighbors, routes and routing tables', () => {
      render(<ZWaveNodeTable info={NETWORK} />);
      expect(screen.getByTestId('zwave-node-2-metrics')).toHaveTextContent('rssi: -60, txFailures: 1');
      expect(screen.getByTestId('zwave-node-2-neighbors')).toHaveTextContent('1, 10');
      expect(screen.getByTestId('zwave-node-10-route')).toHaveTextContent('2');
      expect(screen.getByTestId('zwave-node-2-routing')).toHaveTextContent('1, 10');
    });
  });

  describe('edge cases', () => {
    it('shows a dash for maps that do not mention a node', () => {
      render(<ZWaveNodeTable info={NETWORK} />);
      expect(screen.getByTestId('zwave-node-2-route')).toHaveTextContent('-');
    });

    it('includes nodes that appear in only one map', () => {
      render(<ZWaveNodeTable info={{ route: { 5: [] } }} />);
      expect(screen.getByTestId('zwave-node-5-route')).toHaveTextContent('None');
    });

    it('sorts non-numeric node ids after numeric ones alphabetically', () => {
      render(<ZWaveNodeTable info={{ neighbors: { b: [], a: [] } }} />);
      const rows = screen.getAllByTestId(/^zwave-node-[a-z]$/);
      expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual(['zwave-node-a', 'zwave-node-b']);
    });

    it('shows an empty message when there are no nodes', () => {
      render(<ZWaveNodeTable info={{}} />);
      expect(screen.getByTestId('zwave-nodes-empty')).toBeInTheDocument();
    });
  });
});
