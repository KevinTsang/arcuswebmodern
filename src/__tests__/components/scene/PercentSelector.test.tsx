import { render, screen, fireEvent } from '@testing-library/react';
import { SelectorType } from '@/components/scene/types';
import type { SelectorDef } from '@/components/scene/types';
import { PercentSelector } from '@/components/scene/PercentSelector';

let mockOnChange: jest.Mock;

beforeEach(() => {
  mockOnChange = jest.fn();
});

describe('PercentSelector', () => {
  const sel: SelectorDef = {
    type: SelectorType.PERCENT,
    name: 'brightness',
    min: 0,
    max: 100,
    step: 10,
  };

  it('renders name and percent value', () => {
    render(<PercentSelector sel={sel} current={50} values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('brightness')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders range input with correct attributes', () => {
    render(<PercentSelector sel={sel} current={50} values={{}} onChange={mockOnChange} />);
    const input = screen.getByRole('slider');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveAttribute('step', '10');
    expect(input).toHaveValue('50');
  });

  it('calls onChange when slider value changes', () => {
    render(<PercentSelector sel={sel} current={50} values={{}} onChange={mockOnChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
    expect(mockOnChange).toHaveBeenCalledWith('brightness', 70);
  });

  it('falls back to sel.min when current is not a number', () => {
    render(<PercentSelector sel={sel} current={undefined} values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
