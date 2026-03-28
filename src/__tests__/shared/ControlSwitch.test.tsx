import { render, screen, fireEvent } from '@testing-library/react';
import { ControlSwitch } from '@/components/shared/ControlSwitch';

describe('ControlSwitch', () => {
  const defaultProps = {
    checked: false,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a switch button', () => {
    render(<ControlSwitch {...defaultProps} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('reflects checked state via aria-checked', () => {
    const { rerender } = render(<ControlSwitch {...defaultProps} checked={false} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

    rerender(<ControlSwitch {...defaultProps} checked={true} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with toggled value on click', () => {
    render(<ControlSwitch {...defaultProps} checked={false} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when checked and clicked', () => {
    render(<ControlSwitch {...defaultProps} checked={true} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(false);
  });

  it('does not call onChange when disabled', () => {
    render(<ControlSwitch {...defaultProps} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it('renders label when provided', () => {
    render(<ControlSwitch {...defaultProps} label="Enable notifications" />);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    const { container } = render(<ControlSwitch {...defaultProps} />);
    expect(container.querySelector('.control-switch-label')).toBeNull();
  });
});
