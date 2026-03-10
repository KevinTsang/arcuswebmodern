import { render, screen } from '@testing-library/react';
import CardShell from '@/components/home/CardShell';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe('CardShell', () => {
  it('renders the title', () => {
    render(<CardShell title="Test Card" icon="icon-test"><p>content</p></CardShell>);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<CardShell title="Card" icon="icon-test"><p>Hello</p></CardShell>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders a badge when provided', () => {
    render(
      <CardShell title="Card" icon="icon-test" badge={<span>Pro</span>}>
        <p>content</p>
      </CardShell>,
    );
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('renders View link when href is provided', () => {
    render(<CardShell title="Card" icon="icon-test" href="/test"><p>content</p></CardShell>);
    const links = screen.getAllByRole('link');
    expect(links.some((l) => l.getAttribute('href') === '/test')).toBe(true);
    expect(screen.getByText('View →')).toBeInTheDocument();
  });

  it('does not render links when href is absent', () => {
    render(<CardShell title="Card" icon="icon-test"><p>content</p></CardShell>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('View →')).not.toBeInTheDocument();
  });
});
