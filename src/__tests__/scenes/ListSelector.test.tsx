import { render, screen, fireEvent } from '@testing-library/react';
import { SelectorType } from '@/components/scenes/types';
import type { SelectorDef } from '@/components/scenes/types';
import { ListSelector } from '@/components/scenes/ListSelector';

let mockOnChange: jest.Mock;

beforeEach(() => {
  mockOnChange = jest.fn();
});

describe('ListSelector', () => {
  const sel: SelectorDef = {
    type: SelectorType.LIST,
    name: 'fanspeed',
    options: [
      { label: 'Low', value: 'LOW' },
      { label: 'Medium', value: 'MED' },
      { label: 'High', value: 'HIGH' },
    ],
  };

  it('renders all option buttons', () => {
    render(<ListSelector sel={sel} current="LOW" values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders the selector name', () => {
    render(<ListSelector sel={sel} current="LOW" values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('fanspeed')).toBeInTheDocument();
  });

  it('calls onChange with selected value on click', () => {
    render(<ListSelector sel={sel} current="LOW" values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('High'));
    expect(mockOnChange).toHaveBeenCalledWith('fanspeed', 'HIGH');
  });
});
