import { render, screen, fireEvent } from '@testing-library/react';
import { Place } from '@arcus/core';
import { ServicePlanCard } from '@/components/settings/ServicePlanCard';
import type { ServicePlanState } from '@/components/settings/useServicePlan';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
let mockPlan: ServicePlanState;

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/components/settings/useServicePlan', () => ({
  useServicePlan: () => mockPlan,
}));

jest.mock('@/components/settings/ServicePlanPanel', () => ({
  ServicePlanPanel: () => <div>panel</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockPlan = {
    placeAddress: 'SERV:place:place-1',
    placeId: 'place-1',
    level: Place.SERVICELEVEL_PREMIUM,
    addons: [],
    accountAddress: 'SERV:account:acct-1',
    canManage: true,
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ServicePlanCard', () => {
  it('matches snapshot', () => {
    mockPlan.addons = ['CELLBACKUP'];
    const { asFragment } = render(<ServicePlanCard />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the current plan name', () => {
    render(<ServicePlanCard />);
    expect(screen.getByTestId('info-card-service-plan-value-current-plan')).toHaveTextContent('Premium');
  });

  it('shows a Pro Monitoring plan by name', () => {
    mockPlan.level = Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL;
    render(<ServicePlanCard />);
    expect(screen.getByTestId('info-card-service-plan-value-current-plan')).toHaveTextContent('Professional Monitoring Annual');
  });

  it('lists add-ons', () => {
    mockPlan.addons = ['CELLBACKUP'];
    render(<ServicePlanCard />);
    expect(screen.getByTestId('info-card-service-plan-value-add-ons')).toHaveTextContent('Cellular Backup');
  });

  it('hides the add-ons row without add-ons', () => {
    render(<ServicePlanCard />);
    expect(screen.queryByTestId('info-card-service-plan-value-add-ons')).not.toBeInTheDocument();
  });

  it('opens the plan panel when the owner clicks Change', () => {
    render(<ServicePlanCard />);
    fireEvent.click(screen.getByTestId('service-plan-change'));
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Change Service Plan', key: 'service-plan' });
  });

  it('offers no Change action to someone other than the owner', () => {
    mockPlan.canManage = false;
    render(<ServicePlanCard />);
    expect(screen.queryByTestId('service-plan-change')).not.toBeInTheDocument();
    expect(screen.getByTestId('service-plan-owner-only')).toBeInTheDocument();
  });

  it('shows a dash and no owner note before the place loads', () => {
    mockPlan = { ...mockPlan, placeAddress: undefined, level: undefined, canManage: false };
    render(<ServicePlanCard />);
    expect(screen.getByTestId('info-card-service-plan-value-current-plan')).toHaveTextContent('—');
    expect(screen.queryByTestId('service-plan-owner-only')).not.toBeInTheDocument();
  });

  it('shows a dash when the place has no level', () => {
    mockPlan.level = undefined;
    render(<ServicePlanCard />);
    expect(screen.getByTestId('info-card-service-plan-value-current-plan')).toHaveTextContent('—');
  });
});
