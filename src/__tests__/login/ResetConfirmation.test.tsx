import { render, screen } from '@testing-library/react';
import { ResetConfirmation } from '@/components/login/ResetConfirmation';

// ── Tests ─────────────────────────────────────────────────────────────

describe('ResetConfirmation', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ResetConfirmation />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('confirms the password was reset', () => {
    render(<ResetConfirmation />);
    expect(screen.getByTestId('reset-confirmation')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Password Reset' })).toBeInTheDocument();
    expect(screen.getByText('Your password has successfully been reset.')).toBeInTheDocument();
  });

  it('links back to the login form', () => {
    render(<ResetConfirmation />);
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login');
  });
});
