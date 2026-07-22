import { render, screen } from '@testing-library/react';
import { SubsystemSidebar } from '@/components/services/SubsystemSidebar';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe('SubsystemSidebar', () => {
  it('renders a nav link for each visible subsystem', () => {
    render(<SubsystemSidebar activeSlug="alarms" />);
    expect(screen.getByTestId('subsystem-nav-alarms')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-nav-cameras')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-nav-water')).toBeInTheDocument();
  });

  it('points each link at /services/<slug>/status', () => {
    render(<SubsystemSidebar activeSlug="alarms" />);
    expect(screen.getByTestId('subsystem-nav-cameras')).toHaveAttribute(
      'href',
      '/services/cameras/status',
    );
  });

  it('highlights the active subsystem only', () => {
    render(<SubsystemSidebar activeSlug="climate" />);
    expect(screen.getByTestId('subsystem-nav-climate').className).toContain('text-peacock');
    expect(screen.getByTestId('subsystem-nav-alarms').className).not.toContain('text-peacock');
  });
});
