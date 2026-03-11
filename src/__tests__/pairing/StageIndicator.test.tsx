import { render, screen } from '@testing-library/react';
import StageIndicator from '@/components/pairing/StageIndicator';

describe('StageIndicator', () => {
  it('renders four stage indicators', () => {
    const { container } = render(<StageIndicator stage="steps" />);
    const circles = container.querySelectorAll('.rounded-full');
    expect(circles).toHaveLength(4);
  });

  it('shows numbers for current and future stages', () => {
    render(<StageIndicator stage="steps" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows checkmark for completed stages', () => {
    render(<StageIndicator stage="customize" />);
    // stages 1 (steps) and 2 (searching) are completed → show ✓
    const checkmarks = screen.getAllByText('\u2713');
    expect(checkmarks).toHaveLength(2);
    // stage 3 (customize) is current, stage 4 (completed) is future
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('highlights the current stage with peacock', () => {
    const { container } = render(<StageIndicator stage="searching" />);
    const circles = container.querySelectorAll('.rounded-full');
    // index 1 = searching (current)
    expect(circles[1].className).toContain('bg-peacock');
  });

  it('marks past stages with honeycreeper', () => {
    const { container } = render(<StageIndicator stage="completed" />);
    const circles = container.querySelectorAll('.rounded-full');
    // indices 0, 1, 2 are past
    expect(circles[0].className).toContain('bg-honeycreeper');
    expect(circles[1].className).toContain('bg-honeycreeper');
    expect(circles[2].className).toContain('bg-honeycreeper');
    // index 3 is current
    expect(circles[3].className).toContain('bg-peacock');
  });
});
