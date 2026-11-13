import { render, screen } from '@testing-library/react';
import { DoorsLocksTabs } from '@/components/subsystems/DoorsLocksTabs';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DoorsLocksTabs', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<DoorsLocksTabs active="status" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('links each tab to its route', () => {
    render(<DoorsLocksTabs active="status" />);
    expect(screen.getByTestId('doors-tab-status')).toHaveAttribute('href', '/services/doors-locks/status');
    expect(screen.getByTestId('doors-tab-access-list')).toHaveAttribute('href', '/services/doors-locks/access-list');
    expect(screen.getByTestId('doors-tab-more')).toHaveAttribute('href', '/services/doors-locks/more');
  });

  it('marks only the active tab as current', () => {
    render(<DoorsLocksTabs active="access-list" />);
    expect(screen.getByTestId('doors-tab-access-list')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('doors-tab-status')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('doors-tab-more')).not.toHaveAttribute('aria-current');
  });
});
