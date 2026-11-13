import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LawnNGardenSubsystem } from '@arcus/core';
import { SkipWateringPanel } from '@/components/irrigation/SkipWateringPanel';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import { CONTROLLER, SUBSYSTEM, makeIrrigationState } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
const mockCloseRight = jest.fn();
let mockState: IrrigationControllerState;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/hooks/useIrrigationController', () => ({
  useIrrigationController: () => mockState,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to skip watering' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockState = makeIrrigationState();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SkipWateringPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<SkipWateringPanel address={CONTROLLER} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('offers 12 to 72 hours and defaults to 24', () => {
    render(<SkipWateringPanel address={CONTROLLER} />);
    ['12', '24', '48', '72'].forEach((h) => expect(screen.getByTestId(`skip-watering-${h}`)).toBeInTheDocument());
    expect(screen.getByTestId('skip-watering-24')).toBeChecked();
  });

  it('skips for the default 24 hours', async () => {
    render(<SkipWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('skip-watering-save'));
    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      LawnNGardenSubsystem.CMD_SKIP, SUBSYSTEM, { controller: CONTROLLER, hours: 24 },
    );
  });

  it('skips for the chosen number of hours', async () => {
    render(<SkipWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('skip-watering-72'));
    fireEvent.click(screen.getByTestId('skip-watering-save'));
    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      LawnNGardenSubsystem.CMD_SKIP, SUBSYSTEM, { controller: CONTROLLER, hours: 72 },
    );
  });

  it('shows the in-flight state while saving', async () => {
    mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
    render(<SkipWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('skip-watering-save'));
    await waitFor(() => expect(screen.getByTestId('skip-watering-save')).toBeDisabled());
    expect(screen.getByTestId('skip-watering-save')).toHaveTextContent('Saving…');
  });

  it('shows an error and stays open when skipping fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<SkipWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('skip-watering-save'));
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
    expect(mockCloseRight).not.toHaveBeenCalled();
  });

  it('closes on cancel', () => {
    render(<SkipWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('skip-watering-cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('does nothing without a lawn & garden subsystem', () => {
    mockState = makeIrrigationState({ subsystemAddress: undefined });
    render(<SkipWateringPanel address={CONTROLLER} />);
    expect(screen.getByTestId('skip-watering-save')).toBeDisabled();
    fireEvent.submit(screen.getByTestId('skip-watering-panel'));
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});
