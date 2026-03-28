import { render, screen, fireEvent } from '@testing-library/react';
import { EnumControl } from '@/components/devices/device-settings/EnumControl';

describe('EnumControl – button mode (≤4 options)', () => {
  const options = { '0': 'Off', '1': 'On', '2': 'Auto' };

  it('renders a button for each option', () => {
    render(<EnumControl value="0" options={options} onChange={jest.fn()} />);
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('highlights the selected value', () => {
    render(<EnumControl value="1" options={options} onChange={jest.fn()} />);
    expect(screen.getByText('On').className).toContain('bg-peacock');
    expect(screen.getByText('Off').className).not.toContain('bg-peacock');
  });

  it('calls onChange with the key when a button is clicked', () => {
    const onChange = jest.fn();
    render(<EnumControl value="0" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByText('Auto'));
    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('does not render a select element', () => {
    render(<EnumControl value="0" options={options} onChange={jest.fn()} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

describe('EnumControl – dropdown mode (>4 options)', () => {
  const options = {
    '0': 'Momentary', '1': 'Toggle on/off', '2': 'Toggle state',
    '3': 'Garage door', '4': 'Leak alarm',
  };

  it('renders a select element', () => {
    render(<EnumControl value="0" options={options} onChange={jest.fn()} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all options inside the select', () => {
    render(<EnumControl value="0" options={options} onChange={jest.fn()} />);
    const select = screen.getByRole('combobox');
    expect(select.querySelectorAll('option')).toHaveLength(5);
  });

  it('sets the selected value', () => {
    render(<EnumControl value="2" options={options} onChange={jest.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('2');
  });

  it('calls onChange when selection changes', () => {
    const onChange = jest.fn();
    render(<EnumControl value="0" options={options} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith('3');
  });
});
