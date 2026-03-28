import { render, screen, fireEvent } from '@testing-library/react';
import { SelectorType } from '@/components/scenes/types';
import type { SelectorDef } from '@/components/scenes/types';
import { RangeSelector } from '@/components/scenes/RangeSelector';

let mockOnChange: jest.Mock;

beforeEach(() => {
  mockOnChange = jest.fn();
});

describe('RangeSelector', () => {
  const sel: SelectorDef = {
    type: SelectorType.RANGE,
    name: 'speed',
    min: 0,
    max: 10,
    step: 1,
  };

  it('renders name and value', () => {
    render(<RangeSelector sel={sel} current={5} values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('speed')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('decrements value on minus click', () => {
    render(<RangeSelector sel={sel} current={5} values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('-'));
    expect(mockOnChange).toHaveBeenCalledWith('speed', 4);
  });

  it('increments value on plus click', () => {
    render(<RangeSelector sel={sel} current={5} values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('+'));
    expect(mockOnChange).toHaveBeenCalledWith('speed', 6);
  });

  it('clamps to min on decrement', () => {
    render(<RangeSelector sel={sel} current={0} values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('-'));
    expect(mockOnChange).toHaveBeenCalledWith('speed', 0);
  });

  it('clamps to max on increment', () => {
    render(<RangeSelector sel={sel} current={10} values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('+'));
    expect(mockOnChange).toHaveBeenCalledWith('speed', 10);
  });

  it('appends "s" suffix for DURATION type', () => {
    const durSel: SelectorDef = { ...sel, type: SelectorType.DURATION, name: 'delay' };
    render(<RangeSelector sel={durSel} current={30} values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('does not append "s" for RANGE type', () => {
    render(<RangeSelector sel={sel} current={5} values={{}} onChange={mockOnChange} />);
    expect(screen.queryByText('5s')).not.toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
