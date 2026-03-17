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
});
