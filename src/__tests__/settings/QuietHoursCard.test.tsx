import { render, screen } from '@testing-library/react';
import { QuietHoursCard } from '@/components/settings/QuietHoursCard';

describe('QuietHoursCard', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<QuietHoursCard />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('explains that quiet hours are set on the mobile device', () => {
    render(<QuietHoursCard />);
    expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
    expect(screen.getByTestId('quiet-hours-note')).toHaveTextContent('Do Not Disturb');
  });

  it('has no controls, since the platform has no quiet-hours setting', () => {
    render(<QuietHoursCard />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
