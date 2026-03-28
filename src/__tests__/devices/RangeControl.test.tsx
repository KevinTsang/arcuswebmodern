import { render, screen, fireEvent } from '@testing-library/react';
import { RangeControl } from '@/components/devices/device-settings/RangeControl';

describe('RangeControl', () => {
  it('renders a number input with current value', () => {
    render(<RangeControl value="10" min={0} max={100} onChange={jest.fn()} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(10);
  });

  it('displays the min–max range label', () => {
    render(<RangeControl value="5" min={1} max={65535} onChange={jest.fn()} />);
    expect(screen.getByText('1–65535')).toBeInTheDocument();
  });

  it('calls onChange on blur when value changes', () => {
    const onChange = jest.fn();
    render(<RangeControl value="10" min={0} max={100} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('42');
  });

  it('calls onChange on Enter key when value changes', () => {
    const onChange = jest.fn();
    render(<RangeControl value="10" min={0} max={100} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('50');
  });

  it('does not call onChange on blur when value is unchanged', () => {
    const onChange = jest.fn();
    render(<RangeControl value="10" min={0} max={100} onChange={onChange} />);
    fireEvent.blur(screen.getByRole('spinbutton'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reverts to original value on blur when input is out of range', () => {
    const onChange = jest.fn();
    render(<RangeControl value="10" min={0} max={100} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(10);
  });

  it('reverts to original value on blur when input is below min', () => {
    const onChange = jest.fn();
    render(<RangeControl value="10" min={1} max={100} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(10);
  });

  it('sets min and max attributes on the input', () => {
    render(<RangeControl value="5" min={1} max={99} onChange={jest.fn()} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '99');
  });
});
