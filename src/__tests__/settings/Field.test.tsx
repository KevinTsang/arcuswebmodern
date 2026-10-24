import { render, screen, fireEvent } from '@testing-library/react';
import Field from '@/components/settings/Field';

describe('Field', () => {
  it('renders label text', () => {
    render(<Field label="Email" value="" onChange={jest.fn()} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders input with correct value', () => {
    render(<Field label="Name" value="John" onChange={jest.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('John');
  });

  it('renders placeholder when provided', () => {
    render(<Field label="Email" value="" onChange={jest.fn()} placeholder="you@example.com" />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('calls onChange with input value on change', () => {
    const handleChange = jest.fn();
    render(<Field label="Name" value="" onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Jane' } });
    expect(handleChange).toHaveBeenCalledWith('Jane');
  });

  it('defaults to type text', () => {
    render(<Field label="Name" value="" onChange={jest.fn()} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
  });

  it('shows no error by default', () => {
    render(<Field label="First Name" value="" onChange={jest.fn()} />);
    expect(screen.queryByTestId('field-first-name-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('field-first-name')).not.toHaveAttribute('aria-invalid');
  });

  it('renders the error message and marks the input invalid', () => {
    render(<Field label="First Name" value="" onChange={jest.fn()} error="can't be blank" />);
    expect(screen.getByTestId('field-first-name-error')).toHaveTextContent("can't be blank");
    expect(screen.getByTestId('field-first-name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('calls onBlur when the input loses focus', () => {
    const handleBlur = jest.fn();
    render(<Field label="Name" value="" onChange={jest.fn()} onBlur={handleBlur} />);
    fireEvent.blur(screen.getByRole('textbox'));
    expect(handleBlur).toHaveBeenCalled();
  });

  it('applies custom type', () => {
    const { container } = render(<Field label="Password" value="" onChange={jest.fn()} type="password" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });
});
