import { render, screen, fireEvent } from '@testing-library/react';
import Field from '@/components/settings/Field';

describe('Field', () => {
  it('matches snapshot', () => {
    const { container } = render(<Field id="email" label="Email" value="john@test.com" onChange={jest.fn()} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot with an error', () => {
    const { container } = render(
      <Field id="first-name" label="First Name" value="" onChange={jest.fn()} error="can't be blank" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

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

  it('labels the input', () => {
    render(<Field label="First Name" value="John" onChange={jest.fn()} />);
    expect(screen.getByLabelText('First Name')).toHaveValue('John');
  });

  it('links the error message to the input', () => {
    render(<Field label="First Name" value="" onChange={jest.fn()} error="can't be blank" />);
    expect(screen.getByLabelText('First Name')).toHaveAccessibleDescription("can't be blank");
  });

  it('has no description without an error', () => {
    render(<Field label="First Name" value="" onChange={jest.fn()} />);
    expect(screen.getByLabelText('First Name')).not.toHaveAttribute('aria-describedby');
  });

  it('gives each field its own id', () => {
    render(
      <>
        <Field label="First Name" value="" onChange={jest.fn()} error="can't be blank" />
        <Field label="Last Name" value="" onChange={jest.fn()} error="is too long" />
      </>,
    );
    expect(screen.getByLabelText('First Name')).toHaveAccessibleDescription("can't be blank");
    expect(screen.getByLabelText('Last Name')).toHaveAccessibleDescription('is too long');
  });

  it('uses the given id', () => {
    render(<Field id="contact-phone" label="Phone" value="" onChange={jest.fn()} error="must be a valid phone number" />);
    const input = screen.getByLabelText('Phone');
    expect(input).toHaveAttribute('id', 'contact-phone');
    expect(input).toHaveAttribute('aria-describedby', 'contact-phone-error');
  });

  it('passes autoComplete to the input', () => {
    render(<Field label="Phone" value="" onChange={jest.fn()} type="tel" autoComplete="tel" />);
    expect(screen.getByLabelText('Phone')).toHaveAttribute('autocomplete', 'tel');
  });

  it('can be disabled', () => {
    render(<Field label="Name" value="" onChange={jest.fn()} disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('is enabled by default', () => {
    render(<Field label="Name" value="" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Name')).toBeEnabled();
  });

  it('applies custom type', () => {
    const { container } = render(<Field label="Password" value="" onChange={jest.fn()} type="password" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });
});
