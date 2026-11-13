import { render, screen, fireEvent } from '@testing-library/react';
import { Place } from '@arcus/core';
import { ServicePlanOption } from '@/components/settings/ServicePlanOption';

// ── Helpers ───────────────────────────────────────────────────────────

const mockOnSelect = jest.fn();

const defaultProps = {
  level: Place.SERVICELEVEL_PREMIUM,
  name: 'Premium',
  summary: 'Everything in Basic, and more.',
  checked: false,
  current: false,
  onSelect: mockOnSelect,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ServicePlanOption', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ServicePlanOption {...defaultProps} checked current />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders the name and summary', () => {
    render(<ServicePlanOption {...defaultProps} />);
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Everything in Basic, and more.')).toBeInTheDocument();
  });

  it('reflects the checked state', () => {
    render(<ServicePlanOption {...defaultProps} checked />);
    expect(screen.getByRole('radio', { name: 'Premium' })).toBeChecked();
  });

  it('marks the current plan', () => {
    render(<ServicePlanOption {...defaultProps} current />);
    expect(screen.getByTestId('service-plan-current-premium')).toHaveTextContent('Current');
  });

  it('does not mark other plans as current', () => {
    render(<ServicePlanOption {...defaultProps} />);
    expect(screen.queryByTestId('service-plan-current-premium')).not.toBeInTheDocument();
  });

  it('selects its level when clicked', () => {
    render(<ServicePlanOption {...defaultProps} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Premium' }));
    expect(mockOnSelect).toHaveBeenCalledWith(Place.SERVICELEVEL_PREMIUM);
  });

  it('can be disabled', () => {
    render(<ServicePlanOption {...defaultProps} disabled />);
    expect(screen.getByRole('radio', { name: 'Premium' })).toBeDisabled();
  });
});
