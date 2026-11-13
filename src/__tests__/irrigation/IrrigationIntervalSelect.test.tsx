import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LawnNGardenSubsystem } from '@arcus/core';
import { IrrigationIntervalSelect } from '@/components/irrigation/IrrigationIntervalSelect';
import { CONTROLLER, SUBSYSTEM } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();

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

// ── Helpers ───────────────────────────────────────────────────────────

const NOW = 1_800_000_000_000;
const ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to update watering interval' } };

function select() {
  return screen.getByTestId('irrigation-interval-days');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('IrrigationIntervalSelect', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<IrrigationIntervalSelect address={CONTROLLER} subsystemAddress={SUBSYSTEM} days={3} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the configured interval', () => {
    render(<IrrigationIntervalSelect address={CONTROLLER} subsystemAddress={SUBSYSTEM} days={3} />);
    expect(select()).toHaveValue('3');
    expect(screen.getByRole('option', { name: '1 Day' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '7 Days' })).toBeInTheDocument();
  });

  it('configures the interval starting today', async () => {
    render(<IrrigationIntervalSelect address={CONTROLLER} subsystemAddress={SUBSYSTEM} days={1} />);
    fireEvent.change(select(), { target: { value: '5' } });
    await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
      LawnNGardenSubsystem.CMD_CONFIGUREINTERVALSCHEDULE, SUBSYSTEM,
      { controller: CONTROLLER, startTime: NOW, days: 5 },
    ));
  });

  it('shows the new value and disables the select while saving', async () => {
    mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
    render(<IrrigationIntervalSelect address={CONTROLLER} subsystemAddress={SUBSYSTEM} days={1} />);
    fireEvent.change(select(), { target: { value: '4' } });
    await waitFor(() => expect(select()).toBeDisabled());
    expect(select()).toHaveValue('4');
  });

  it('reverts and shows an error when saving fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<IrrigationIntervalSelect address={CONTROLLER} subsystemAddress={SUBSYSTEM} days={2} />);
    fireEvent.change(select(), { target: { value: '6' } });
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
    await waitFor(() => expect(select()).toHaveValue('2'));
  });

  it('is disabled without a lawn & garden subsystem', () => {
    render(<IrrigationIntervalSelect address={CONTROLLER} subsystemAddress={undefined} days={2} />);
    expect(select()).toBeDisabled();
  });
});
