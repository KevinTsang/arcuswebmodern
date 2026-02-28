import { render, screen, fireEvent } from '@testing-library/react';
import { Spinner } from '@/components/shared/Spinner';

describe('Spinner', () => {
  it('renders the current value', () => {
    render(<Spinner value={42} onChange={() => {}} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('increments on + click', () => {
    const onChange = jest.fn();
    render(<Spinner value={5} onChange={onChange} step={1} />);
    fireEvent.click(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('decrements on - click', () => {
    const onChange = jest.fn();
    render(<Spinner value={5} onChange={onChange} step={1} />);
    fireEvent.click(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('clamps to max without cycle', () => {
    const onChange = jest.fn();
    render(<Spinner value={10} onChange={onChange} max={10} />);
    fireEvent.click(screen.getByLabelText('Increase'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clamps to min without cycle', () => {
    const onChange = jest.fn();
    render(<Spinner value={0} onChange={onChange} min={0} />);
    fireEvent.click(screen.getByLabelText('Decrease'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('wraps around max with cycle', () => {
    const onChange = jest.fn();
    render(<Spinner value={10} onChange={onChange} min={0} max={10} cycle />);
    fireEvent.click(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('wraps around min with cycle', () => {
    const onChange = jest.fn();
    render(<Spinner value={0} onChange={onChange} min={0} max={10} cycle />);
    fireEvent.click(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('uses custom format function', () => {
    render(<Spinner value={72} onChange={() => {}} format={(v) => `${v}°F`} />);
    expect(screen.getByText('72°F')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Spinner value={5} onChange={() => {}} label="Temperature" />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
  });

  it('disables interaction when disabled', () => {
    const onChange = jest.fn();
    render(<Spinner value={5} onChange={onChange} disabled />);
    fireEvent.click(screen.getByLabelText('Increase'));
    fireEvent.click(screen.getByLabelText('Decrease'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
