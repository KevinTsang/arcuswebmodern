import { render, screen } from '@testing-library/react';
import { Place } from '@arcus/core';
import { ServicePlanDowngradeWarning } from '@/components/settings/ServicePlanDowngradeWarning';

describe('ServicePlanDowngradeWarning', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(
      <ServicePlanDowngradeWarning from={Place.SERVICELEVEL_PREMIUM_PROMON} to={Place.SERVICELEVEL_BASIC} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('lists premium features lost moving from Premium to Basic', () => {
    render(<ServicePlanDowngradeWarning from={Place.SERVICELEVEL_PREMIUM} to={Place.SERVICELEVEL_BASIC} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Alarm Tracker')).toBeInTheDocument();
    expect(screen.queryByText(/professional monitoring/)).not.toBeInTheDocument();
  });

  it('warns about losing professional monitoring when leaving Pro Monitoring for Premium', () => {
    render(<ServicePlanDowngradeWarning from={Place.SERVICELEVEL_PREMIUM_PROMON} to={Place.SERVICELEVEL_PREMIUM} />);
    expect(screen.getByText(/24\/7 professional monitoring/)).toBeInTheDocument();
    expect(screen.queryByText('Alarm Tracker')).not.toBeInTheDocument();
  });

  it('lists both when leaving Pro Monitoring for Basic', () => {
    render(<ServicePlanDowngradeWarning from={Place.SERVICELEVEL_PREMIUM_PROMON_FREE} to={Place.SERVICELEVEL_BASIC} />);
    expect(screen.getByText(/24\/7 professional monitoring/)).toBeInTheDocument();
    expect(screen.getByText('Alarm Tracker')).toBeInTheDocument();
  });

  it('renders nothing for an upgrade', () => {
    const { container } = render(
      <ServicePlanDowngradeWarning from={Place.SERVICELEVEL_BASIC} to={Place.SERVICELEVEL_PREMIUM} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing between premium variants', () => {
    const { container } = render(
      <ServicePlanDowngradeWarning from={Place.SERVICELEVEL_PREMIUM_ANNUAL} to={Place.SERVICELEVEL_PREMIUM} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
