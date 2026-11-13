import { render, screen } from '@testing-library/react';
import { DoorsLocksServiceView } from '@/components/subsystems/DoorsLocksServiceView';

// ── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/components/subsystems/DoorsLocksView', () => ({
  DoorsLocksView: () => <div data-testid="status-view" />,
}));

jest.mock('@/components/subsystems/LockAccessList', () => ({
  LockAccessList: () => <div data-testid="access-list-view" />,
}));

jest.mock('@/components/subsystems/DoorChimeSettings', () => ({
  DoorChimeSettings: () => <div data-testid="chime-view" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DoorsLocksServiceView', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<DoorsLocksServiceView action="status" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the status view by default', () => {
    render(<DoorsLocksServiceView />);
    expect(screen.getByTestId('status-view')).toBeInTheDocument();
    expect(screen.getByTestId('doors-tab-status')).toHaveAttribute('aria-current', 'page');
  });

  it('shows the access list for the access-list action', () => {
    render(<DoorsLocksServiceView action="access-list" />);
    expect(screen.getByTestId('access-list-view')).toBeInTheDocument();
    expect(screen.queryByTestId('status-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('doors-tab-access-list')).toHaveAttribute('aria-current', 'page');
  });

  it('shows the chime settings for the more action', () => {
    render(<DoorsLocksServiceView action="more" />);
    expect(screen.getByTestId('chime-view')).toBeInTheDocument();
    expect(screen.getByTestId('doors-tab-more')).toHaveAttribute('aria-current', 'page');
  });

  it('falls back to status for an unknown action', () => {
    render(<DoorsLocksServiceView action="bogus" />);
    expect(screen.getByTestId('status-view')).toBeInTheDocument();
    expect(screen.getByTestId('doors-tab-status')).toHaveAttribute('aria-current', 'page');
  });
});
