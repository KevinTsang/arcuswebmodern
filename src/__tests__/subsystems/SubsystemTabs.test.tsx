import { render, screen } from '@testing-library/react';
import { SubsystemTabs } from '@/components/subsystems/SubsystemTabs';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SubsystemTabs', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<SubsystemTabs slug="doors-locks" active="status" testIdPrefix="doors-tab" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('links each Doors & Locks tab to its route', () => {
    render(<SubsystemTabs slug="doors-locks" active="status" testIdPrefix="doors-tab" />);
    expect(screen.getByTestId('doors-tab-status')).toHaveAttribute('href', '/services/doors-locks/status');
    expect(screen.getByTestId('doors-tab-access-list')).toHaveAttribute('href', '/services/doors-locks/access-list');
    expect(screen.getByTestId('doors-tab-more')).toHaveAttribute('href', '/services/doors-locks/more');
  });

  it('renders the alarm tabs with their own test id prefix', () => {
    render(<SubsystemTabs slug="alarms" active="settings" testIdPrefix="alarm-tab" />);
    expect(screen.getByTestId('alarm-tab-status')).toHaveAttribute('href', '/services/alarms/status');
    expect(screen.getByTestId('alarm-tab-settings')).toHaveAttribute('aria-current', 'page');
  });

  it('marks only the active tab as current', () => {
    render(<SubsystemTabs slug="doors-locks" active="access-list" testIdPrefix="doors-tab" />);
    expect(screen.getByTestId('doors-tab-access-list')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('doors-tab-status')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('doors-tab-more')).not.toHaveAttribute('aria-current');
  });

  it('uses the border-radius token on tabs', () => {
    render(<SubsystemTabs slug="alarms" active="status" testIdPrefix="alarm-tab" />);
    expect(screen.getByTestId('alarm-tab-status')).toHaveClass('rounded-[var(--border-radius-base)]');
  });
});
