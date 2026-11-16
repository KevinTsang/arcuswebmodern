import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Account, Base, Place } from '@arcus/core';
import { ServicePlanPanel } from '@/components/settings/ServicePlanPanel';
import type { ServicePlanState } from '@/components/settings/useServicePlan';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
const mockCloseRight = jest.fn();
let mockPlan: ServicePlanState;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/slices/placeSlice', () => ({
  updatePlace: (payload: unknown) => ({ type: 'place/updatePlace', payload }),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/components/settings/useServicePlan', () => ({
  useServicePlan: () => mockPlan,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ERROR_TOAST = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Unable to change your service plan. Please try again.' },
};

function pick(name: string) {
  fireEvent.click(screen.getByRole('radio', { name }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockPlan = {
    placeAddress: 'SERV:place:place-1',
    placeId: 'place-1',
    level: Place.SERVICELEVEL_BASIC,
    addons: [],
    accountAddress: 'SERV:account:acct-1',
    canManage: true,
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ServicePlanPanel', () => {
  describe('rendering', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<ServicePlanPanel />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('shows the current plan and selects it', () => {
      render(<ServicePlanPanel />);
      expect(screen.getByTestId('service-plan-panel-current')).toHaveTextContent('Basic');
      expect(screen.getByRole('radio', { name: 'Basic' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Premium' })).not.toBeChecked();
      expect(screen.getByTestId('service-plan-current-basic')).toBeInTheDocument();
    });

    it('disables Change Plan until a different plan is picked', () => {
      render(<ServicePlanPanel />);
      expect(screen.getByTestId('service-plan-save')).toBeDisabled();
      pick('Premium');
      expect(screen.getByTestId('service-plan-save')).toBeEnabled();
      pick('Basic');
      expect(screen.getByTestId('service-plan-save')).toBeDisabled();
    });

    it('links to Pro Monitoring enrollment', () => {
      render(<ServicePlanPanel />);
      expect(screen.getByRole('link', { name: 'Set up Pro Monitoring' })).toHaveAttribute('href', '/promonitoring');
    });

    it('closes the panel when following the Pro Monitoring link', () => {
      render(<ServicePlanPanel />);
      fireEvent.click(screen.getByRole('link', { name: 'Set up Pro Monitoring' }));
      expect(mockCloseRight).toHaveBeenCalled();
    });

    it('keeps a plan that is not directly pickable in the list', () => {
      mockPlan.level = Place.SERVICELEVEL_PREMIUM_PROMON;
      render(<ServicePlanPanel />);
      expect(screen.getByRole('radio', { name: 'Professional Monitoring' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Basic' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Premium' })).toBeInTheDocument();
      expect(screen.queryByTestId('service-plan-promon')).not.toBeInTheDocument();
    });
  });

  describe('downgrade warning', () => {
    it('warns before moving from Premium to Basic', () => {
      mockPlan.level = Place.SERVICELEVEL_PREMIUM;
      render(<ServicePlanPanel />);
      expect(screen.queryByTestId('service-plan-downgrade-warning')).not.toBeInTheDocument();
      pick('Basic');
      expect(screen.getByTestId('service-plan-downgrade-warning')).toBeInTheDocument();
    });

    it('does not warn for an upgrade', () => {
      render(<ServicePlanPanel />);
      pick('Premium');
      expect(screen.queryByTestId('service-plan-downgrade-warning')).not.toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('sends UpdateServicePlan, applies the new level, toasts and closes', async () => {
      render(<ServicePlanPanel />);
      pick('Premium');
      fireEvent.click(screen.getByTestId('service-plan-save'));

      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledWith(Account.CMD_UPDATESERVICEPLAN, 'SERV:account:acct-1', {
        placeID: 'place-1',
        serviceLevel: Place.SERVICELEVEL_PREMIUM,
        addons: {},
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'place/updatePlace',
        payload: { [Base.ATTR_ADDRESS]: 'SERV:place:place-1', [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM },
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Your service plan is now Premium.' },
      });
    });

    it('keeps the place\'s add-ons', async () => {
      mockPlan.addons = ['CELLBACKUP'];
      render(<ServicePlanPanel />);
      pick('Premium');
      fireEvent.click(screen.getByTestId('service-plan-save'));

      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalled());
      expect(mockBridgeRequest.mock.calls[0][2].addons).toEqual({ CELLBACKUP: true });
    });

    it('shows Saving… and disables the choices while the request is in flight', async () => {
      let resolve: (v: object) => void = () => {};
      mockBridgeRequest.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
      render(<ServicePlanPanel />);
      pick('Premium');
      fireEvent.click(screen.getByTestId('service-plan-save'));

      expect(await screen.findByText('Saving…')).toBeInTheDocument();
      expect(screen.getByTestId('service-plan-save')).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Basic' })).toBeDisabled();

      resolve({});
      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    });

    it('toasts an error and stays open when the platform refuses', async () => {
      mockBridgeRequest.mockRejectedValueOnce({ code: 'error.invalid' });
      render(<ServicePlanPanel />);
      pick('Premium');
      fireEvent.click(screen.getByTestId('service-plan-save'));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR_TOAST));
      expect(mockCloseRight).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'place/updatePlace' }));
      // The pick survives, so the owner can retry
      expect(screen.getByRole('radio', { name: 'Premium' })).toBeChecked();
      expect(screen.getByTestId('service-plan-save')).toBeEnabled();
    });

    it('can retry after a failure', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<ServicePlanPanel />);
      pick('Premium');
      fireEvent.click(screen.getByTestId('service-plan-save'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR_TOAST));

      fireEvent.click(screen.getByTestId('service-plan-save'));
      await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
      expect(mockBridgeRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('shows a loading message before the place loads', () => {
      mockPlan = { ...mockPlan, placeAddress: undefined, placeId: undefined, level: undefined, canManage: false };
      render(<ServicePlanPanel />);
      expect(screen.getByTestId('service-plan-loading')).toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('explains that only the owner can change the plan', () => {
      mockPlan.canManage = false;
      render(<ServicePlanPanel />);
      expect(screen.getByTestId('service-plan-not-owner')).toBeInTheDocument();
      expect(screen.queryByTestId('service-plan-save')).not.toBeInTheDocument();
    });

    it('treats a place with no level like one it cannot change', () => {
      mockPlan.level = undefined;
      render(<ServicePlanPanel />);
      expect(screen.getByTestId('service-plan-not-owner')).toBeInTheDocument();
    });

    it('follows a plan change made while the panel is open', () => {
      const { rerender } = render(<ServicePlanPanel />);
      mockPlan = { ...mockPlan, level: Place.SERVICELEVEL_PREMIUM };
      rerender(<ServicePlanPanel />);
      expect(screen.getByRole('radio', { name: 'Premium' })).toBeChecked();
      expect(screen.getByTestId('service-plan-save')).toBeDisabled();
    });
  });
});
