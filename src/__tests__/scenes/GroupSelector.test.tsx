import { render, screen, fireEvent } from '@testing-library/react';
import { SelectorType } from '@/components/scenes/types';
import type { SelectorDef } from '@/components/scenes/types';
import { GroupSelector } from '@/components/scenes/GroupSelector';

let mockOnChange: jest.Mock;

beforeEach(() => {
  mockOnChange = jest.fn();
});

describe('GroupSelector – 2-option toggle', () => {
  const sel: SelectorDef = {
    type: SelectorType.GROUP,
    name: 'switch',
    options: [
      { label: 'On', value: 'ON' },
      { label: 'Off', value: 'OFF' },
    ],
  };

  it('renders name and current label', () => {
    render(<GroupSelector sel={sel} current="ON" values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('switch')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
  });

  it('renders switch with aria-checked based on active option', () => {
    render(<GroupSelector sel={sel} current="ON" values={{}} onChange={mockOnChange} />);
    // isFirst = true (ON is first option), aria-checked = !isFirst = false
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles to second option when first is active', () => {
    render(<GroupSelector sel={sel} current="ON" values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(mockOnChange).toHaveBeenCalledWith('switch', 'OFF');
  });

  it('toggles to first option when second is active', () => {
    render(<GroupSelector sel={sel} current="OFF" values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(mockOnChange).toHaveBeenCalledWith('switch', 'ON');
  });
});

describe('GroupSelector – 3+ option radio', () => {
  const sel: SelectorDef = {
    type: SelectorType.GROUP,
    name: 'mode',
    options: [
      { label: 'Off', value: 'OFF' },
      { label: 'Heat', value: 'HEAT' },
      { label: 'Cool', value: 'COOL' },
    ],
  };

  it('renders all option buttons', () => {
    render(<GroupSelector sel={sel} current="OFF" values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('Heat')).toBeInTheDocument();
    expect(screen.getByText('Cool')).toBeInTheDocument();
  });

  it('calls onChange with selected value', () => {
    render(<GroupSelector sel={sel} current="OFF" values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Cool'));
    expect(mockOnChange).toHaveBeenCalledWith('mode', 'COOL');
  });
});
