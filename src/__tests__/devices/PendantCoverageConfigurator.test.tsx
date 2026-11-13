import { render, screen } from '@testing-library/react';
import PendantCoverageConfigurator from '@/components/devices/PendantCoverageConfigurator';

// ── Tests ─────────────────────────────────────────────────────────────

describe('PendantCoverageConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PendantCoverageConfigurator />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('explains how to test the pendant range', () => {
    render(<PendantCoverageConfigurator />);
    expect(screen.getByText('Test Your Coverage')).toBeInTheDocument();
    expect(screen.getByTestId('pendant-coverage')).toHaveTextContent('130ft');
    expect(screen.getByTestId('pendant-coverage')).toHaveTextContent('range extenders');
  });
});
