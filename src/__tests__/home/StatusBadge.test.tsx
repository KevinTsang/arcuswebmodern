import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/home/StatusBadge';

describe('StatusBadge', () => {
  it('renders the label', () => {
    render(<StatusBadge label="Security" value="Disarmed" color="text-grouse" />);
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('renders the value', () => {
    render(<StatusBadge label="Security" value="Disarmed" color="text-grouse" />);
    expect(screen.getByText('Disarmed')).toBeInTheDocument();
  });

  it('applies the color class to the value', () => {
    render(<StatusBadge label="On" value="3" color="text-canary" />);
    const value = screen.getByText('3');
    expect(value.className).toContain('text-canary');
  });
});
