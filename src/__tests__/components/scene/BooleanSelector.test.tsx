import { render, screen, fireEvent } from '@testing-library/react';
import { BooleanSelector } from '@/components/scene/BooleanSelector';

let mockOnChange: jest.Mock;

beforeEach(() => {
  mockOnChange = jest.fn();
});

describe('BooleanSelector', () => {
  it('renders name label', () => {
    render(<BooleanSelector name="enabled" current={false} onChange={mockOnChange} />);
    expect(screen.getByText('enabled')).toBeInTheDocument();
  });

  it('renders switch with aria-checked false when current is false', () => {
    render(<BooleanSelector name="enabled" current={false} onChange={mockOnChange} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('renders switch with aria-checked true when current is true', () => {
    render(<BooleanSelector name="enabled" current={true} onChange={mockOnChange} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('treats string "true" as truthy', () => {
    render(<BooleanSelector name="enabled" current="true" onChange={mockOnChange} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with toggled value on click', () => {
    render(<BooleanSelector name="enabled" current={false} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(mockOnChange).toHaveBeenCalledWith('enabled', true);
  });

  it('calls onChange with false when toggling from true', () => {
    render(<BooleanSelector name="enabled" current={true} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(mockOnChange).toHaveBeenCalledWith('enabled', false);
  });
});
