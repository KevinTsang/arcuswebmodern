import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@/components/shared/ProgressBar';

describe('ProgressBar', () => {
  it('renders the bar with correct width', () => {
    const { container } = render(<ProgressBar percent={50} />);
    const bar = container.querySelector('[style]');
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('clamps percent to 0-100', () => {
    const { container, rerender } = render(<ProgressBar percent={150} />);
    let bar = container.querySelector('[style]');
    expect(bar).toHaveStyle({ width: '100%' });

    rerender(<ProgressBar percent={-20} />);
    bar = container.querySelector('[style]');
    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('renders label and percentage text when label provided', () => {
    render(<ProgressBar percent={75} label="Loading" />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('does not render label text when not provided', () => {
    const { container } = render(<ProgressBar percent={50} />);
    expect(container.querySelector('.progress-bar-label')).toBeNull();
  });
});
