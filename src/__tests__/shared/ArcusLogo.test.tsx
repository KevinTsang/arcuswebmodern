import { render, screen } from '@testing-library/react';
import { ArcusLogo } from '@/components/shared/ArcusLogo';

describe('ArcusLogo', () => {
  it('matches snapshot', () => {
    const { container } = render(<ArcusLogo className="w-8 h-8" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders six sectors and four cube faces', () => {
    const { container } = render(<ArcusLogo />);
    expect(container.querySelectorAll('path')).toHaveLength(10);
  });

  it('applies className to the svg', () => {
    const { container } = render(<ArcusLogo className="w-24 h-24" />);
    expect(container.querySelector('svg')).toHaveClass('w-24', 'h-24');
  });

  it('is hidden from assistive tech by default', () => {
    const { container } = render(<ArcusLogo />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('exposes an accessible name when label is given', () => {
    render(<ArcusLogo label="Arcus" />);
    expect(screen.getByRole('img', { name: 'Arcus' })).toBeInTheDocument();
  });
});
