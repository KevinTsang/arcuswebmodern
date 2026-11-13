import { render, screen } from '@testing-library/react';
import { IrrigationZoneList } from '@/components/irrigation/IrrigationZoneList';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import { CONTROLLER, makeIrrigationState } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockState: IrrigationControllerState;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
}));

jest.mock('@/hooks/useIrrigationController', () => ({
  useIrrigationController: () => mockState,
}));

// ── Helpers ───────────────────────────────────────────────────────────

beforeEach(() => {
  mockState = makeIrrigationState();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationZoneList', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<IrrigationZoneList address={CONTROLLER} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders a row per zone', () => {
    render(<IrrigationZoneList address={CONTROLLER} />);
    expect(screen.getByTestId(`irrigation-zone-name-${CONTROLLER}-z1`)).toHaveTextContent('Front Lawn');
    expect(screen.getByTestId(`irrigation-zone-name-${CONTROLLER}-z2`)).toHaveTextContent('Back Lawn');
  });

  it('disables starting zones while the schedule is skipped', () => {
    mockState = makeIrrigationState({ skippedUntil: 123 });
    render(<IrrigationZoneList address={CONTROLLER} />);
    expect(screen.getByTestId(`irrigation-zone-start-${CONTROLLER}-z1`)).toBeDisabled();
  });

  it('shows a message when the controller reports no zones', () => {
    mockState = makeIrrigationState({ zones: [] });
    render(<IrrigationZoneList address={CONTROLLER} />);
    expect(screen.getByTestId(`irrigation-zones-empty-${CONTROLLER}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`irrigation-zones-${CONTROLLER}`)).not.toBeInTheDocument();
  });
});
