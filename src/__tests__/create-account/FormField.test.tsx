import { render, screen, fireEvent } from '@testing-library/react';
import FormField from '@/components/create-account/FormField';

describe('FormField', () => {
  it('renders label and input', () => {
    const onChange = jest.fn();
    render(<FormField label="Email" id="email" value="" onChange={onChange} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('calls onChange with input value', () => {
    const onChange = jest.fn();
    render(<FormField label="Email" id="email" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@a.com' } });
    expect(onChange).toHaveBeenCalledWith('test@a.com');
  });

  it('calls form.markChanged on change', () => {
    const onChange = jest.fn();
    const form = {
      markChanged: jest.fn(),
      markVisited: jest.fn(),
      validateSingle: jest.fn(),
      getFieldErrors: jest.fn(() => []),
      visited: {},
    } as any;
    render(<FormField label="Name" id="name" value="" onChange={onChange} form={form} allValues={{}} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'x' } });
    expect(form.markChanged).toHaveBeenCalledWith('name');
  });

  it('calls form.markVisited and validateSingle on blur', () => {
    const onChange = jest.fn();
    const form = {
      markChanged: jest.fn(),
      markVisited: jest.fn(),
      validateSingle: jest.fn(),
      getFieldErrors: jest.fn(() => []),
      visited: {},
    } as any;
    const allValues = { name: 'val' };
    render(<FormField label="Name" id="name" value="val" onChange={onChange} form={form} allValues={allValues} />);
    fireEvent.blur(screen.getByLabelText('Name'));
    expect(form.markVisited).toHaveBeenCalledWith('name');
    expect(form.validateSingle).toHaveBeenCalledWith('name', 'val', allValues);
  });

  it('shows error when visited and form has errors', () => {
    const form = {
      markChanged: jest.fn(),
      markVisited: jest.fn(),
      validateSingle: jest.fn(),
      getFieldErrors: jest.fn(() => ['is required']),
      visited: { name: true },
    } as any;
    render(<FormField label="Name" id="name" value="" onChange={jest.fn()} form={form} allValues={{}} />);
    expect(screen.getByText('is required')).toBeInTheDocument();
  });

  it('does not show errors when not visited', () => {
    const form = {
      markChanged: jest.fn(),
      markVisited: jest.fn(),
      validateSingle: jest.fn(),
      getFieldErrors: jest.fn(() => ['is required']),
      visited: {},
    } as any;
    render(<FormField label="Name" id="name" value="" onChange={jest.fn()} form={form} allValues={{}} />);
    expect(screen.queryByText('is required')).not.toBeInTheDocument();
  });

  it('uses name as the validation key when it differs from the id', () => {
    const form = {
      markChanged: jest.fn(),
      markVisited: jest.fn(),
      validateSingle: jest.fn(),
      getFieldErrors: jest.fn(() => ['is invalid']),
      visited: { emailAddress: true },
    } as any;
    const allValues = { emailAddress: 'x' };
    render(
      <FormField label="Email" id="email" name="emailAddress" value="x" onChange={jest.fn()} form={form} allValues={allValues} />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
    fireEvent.change(input, { target: { value: 'xy' } });
    fireEvent.blur(input);
    expect(form.markChanged).toHaveBeenCalledWith('emailAddress');
    expect(form.markVisited).toHaveBeenCalledWith('emailAddress');
    expect(form.validateSingle).toHaveBeenCalledWith('emailAddress', 'x', allValues);
    expect(form.getFieldErrors).toHaveBeenCalledWith('emailAddress');
    expect(screen.getByText('is invalid')).toBeInTheDocument();
  });

  it('applies className to the wrapper', () => {
    const { container } = render(<FormField label="Email" id="email" className="mb-4" value="" onChange={jest.fn()} />);
    expect(container.firstChild).toHaveClass('mb-4');
  });
});
