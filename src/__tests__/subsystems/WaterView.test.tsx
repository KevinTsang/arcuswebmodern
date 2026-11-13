import { render, screen } from '@testing-library/react';
import { WaterView } from '@/components/subsystems/WaterView';
import { getSubsystemConfigBySlug } from '@/lib/subsystemConfig';

// ── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/components/subsystems/WaterStatusSummary', () => ({
  WaterStatusSummary: () => <div data-testid="water-summary-mock" />,
}));

jest.mock('@/components/subsystems/GenericDeviceListView', () => ({
  GenericDeviceListView: ({ config }: { config: { name: string } }) => (
    <div data-testid="generic-view">{config.name}</div>
  ),
}));

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterView', () => {
  const config = getSubsystemConfigBySlug('water')!;

  it('matches snapshot', () => {
    const { asFragment } = render(<WaterView config={config} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders the summary above the water device list', () => {
    render(<WaterView config={config} />);
    const summary = screen.getByTestId('water-summary-mock');
    const list = screen.getByTestId('generic-view');
    expect(list).toHaveTextContent('Water');
    expect(summary.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
