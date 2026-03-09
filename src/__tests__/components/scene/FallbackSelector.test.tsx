import { render, screen } from '@testing-library/react';
import { FallbackSelector } from '@/components/scene/FallbackSelector';

describe('FallbackSelector', () => {
  it('renders name and value', () => {
    render(<FallbackSelector name="color" current="red" />);
    expect(screen.getByText('color:')).toBeInTheDocument();
    expect(screen.getByText('red')).toBeInTheDocument();
  });

  it('renders empty string for null/undefined current', () => {
    const { container } = render(<FallbackSelector name="custom" current={undefined} />);
    expect(screen.getByText('custom:')).toBeInTheDocument();
    const valueSpan = container.querySelector('.text-swift');
    expect(valueSpan).toBeInTheDocument();
    expect(valueSpan!.textContent).toBe('');
  });
});
