import { render, screen, fireEvent } from '@testing-library/react';
import PersonRow from '@/components/settings/PersonRow';

describe('PersonRow', () => {
  it('renders name and email', () => {
    render(<PersonRow name="Jane Doe" email="jane@test.com" />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@test.com')).toBeInTheDocument();
  });

  it('shows avatar with first letter of name', () => {
    render(<PersonRow name="Jane Doe" email="" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('shows role when provided', () => {
    render(<PersonRow name="Jane" email="" role="Owner" />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('shows Details button when onEdit provided', () => {
    const onEdit = jest.fn();
    render(<PersonRow name="Jane" email="" onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Details'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('does not show Details button when no onEdit', () => {
    render(<PersonRow name="Jane" email="" />);
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
  });
});
