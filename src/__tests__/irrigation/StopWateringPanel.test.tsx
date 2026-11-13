import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LawnNGardenSubsystem } from '@arcus/core';
import { StopWateringPanel } from '@/components/irrigation/StopWateringPanel';
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

const ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to stop watering' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockState = makeIrrigationState({ watering: true });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('StopWateringPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<StopWateringPanel address={CONTROLLER} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('defaults to stopping all zones', () => {
    render(<StopWateringPanel address={CONTROLLER} />);
    expect(screen.getByTestId('stop-watering-all')).toBeChecked();
    expect(screen.getByTestId('stop-watering-current')).not.toBeChecked();
    expect(screen.getByText('Backyard Sprinklers')).toBeInTheDocument();
  });

  it('stops all zones', async () => {
    render(<StopWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('stop-watering-save'));
    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      LawnNGardenSubsystem.CMD_STOPWATERING, SUBSYSTEM, { controller: CONTROLLER, currentOnly: false },
    );
  });

  it('stops only the current zone', async () => {
    render(<StopWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('stop-watering-current'));
    fireEvent.click(screen.getByTestId('stop-watering-save'));
    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      LawnNGardenSubsystem.CMD_STOPWATERING, SUBSYSTEM, { controller: CONTROLLER, currentOnly: true },
    );
  });

  it('shows the in-flight state while stopping', async () => {
    mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
    render(<StopWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('stop-watering-save'));
    await waitFor(() => expect(screen.getByTestId('stop-watering-save')).toBeDisabled());
    expect(screen.getByTestId('stop-watering-save')).toHaveTextContent('Stopping…');
  });

  it('shows an error and stays open when stopping fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<StopWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('stop-watering-save'));
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
    expect(mockCloseRight).not.toHaveBeenCalled();
  });

  it('closes on cancel', () => {
    render(<StopWateringPanel address={CONTROLLER} />);
    fireEvent.click(screen.getByTestId('stop-watering-cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('disables saving without a lawn & garden subsystem', () => {
    mockState = makeIrrigationState({ subsystemAddress: undefined, device: undefined });
    render(<StopWateringPanel address={CONTROLLER} />);
    expect(screen.getByTestId('stop-watering-save')).toBeDisabled();
    expect(screen.getByText('Irrigation Controller')).toBeInTheDocument();
    fireEvent.submit(screen.getByTestId('stop-watering-panel'));
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});
