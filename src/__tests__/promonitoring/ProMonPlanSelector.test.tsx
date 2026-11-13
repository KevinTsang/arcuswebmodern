import { render, screen, fireEvent } from '@testing-library/react';
import { ProMonPlanSelector } from '@/components/promonitoring/ProMonPlanSelector';

// ── Helpers ───────────────────────────────────────────────────────────

const onChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ProMonPlanSelector', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ProMonPlanSelector annual={false} onChange={onChange} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('offers monthly and annual billing', () => {
      render(<ProMonPlanSelector annual={false} onChange={onChange} />);
      expect(screen.getByRole('group', { name: 'Billing' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Monthly/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Annual/)).toBeInTheDocument();
    });

    it('checks monthly when annual is false', () => {
      render(<ProMonPlanSelector annual={false} onChange={onChange} />);
      expect(screen.getByTestId('promon-plan-monthly')).toBeChecked();
      expect(screen.getByTestId('promon-plan-annual')).not.toBeChecked();
    });

    it('checks annual when annual is true', () => {
      render(<ProMonPlanSelector annual onChange={onChange} />);
      expect(screen.getByTestId('promon-plan-annual')).toBeChecked();
      expect(screen.getByTestId('promon-plan-monthly')).not.toBeChecked();
    });
  });

  describe('interaction', () => {
    it('reports annual when Annual is chosen', () => {
      render(<ProMonPlanSelector annual={false} onChange={onChange} />);
      fireEvent.click(screen.getByTestId('promon-plan-annual'));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('reports monthly when Monthly is chosen', () => {
      render(<ProMonPlanSelector annual onChange={onChange} />);
      fireEvent.click(screen.getByTestId('promon-plan-monthly'));
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it('does not report a click on the plan already selected', () => {
      render(<ProMonPlanSelector annual onChange={onChange} />);
      fireEvent.click(screen.getByTestId('promon-plan-annual'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('disables both choices when disabled', () => {
      render(<ProMonPlanSelector annual={false} onChange={onChange} disabled />);
      expect(screen.getByTestId('promon-plan-monthly')).toBeDisabled();
      expect(screen.getByTestId('promon-plan-annual')).toBeDisabled();
    });
  });
});
