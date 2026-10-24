import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlarmSubsystem } from '@arcus/core';
import { AlarmPanicControl } from '@/components/subsystems/AlarmPanicControl';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

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

// ── Helpers ───────────────────────────────────────────────────────────

const ALARM_ADDR = 'SERV:subalarm:abc';

function openPrompt() {
  fireEvent.click(screen.getByTestId('alarm-panic'));
}

/** A Bridge request that stays in flight until the test resolves it. */
function deferredRequest() {
  let resolve!: () => void;
  mockBridgeRequest.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
  return () => resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AlarmPanicControl', () => {
  // ── Snapshots ───────────────────────────────────────────────────────
  it('matches snapshot', () => {
    const { container } = render(<AlarmPanicControl address={ALARM_ADDR} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot with the confirm prompt open', () => {
    const { container } = render(<AlarmPanicControl address={ALARM_ADDR} />);
    openPrompt();
    expect(container.firstChild).toMatchSnapshot();
  });

  // ── Rendering ───────────────────────────────────────────────────────
  it('renders the Panic button and no prompt initially', () => {
    render(<AlarmPanicControl address={ALARM_ADDR} />);
    expect(screen.getByTestId('alarm-panic')).toHaveTextContent('Panic');
    expect(screen.getByText('Emergency')).toBeInTheDocument();
    expect(screen.queryByTestId('alarm-panic-confirm-prompt')).not.toBeInTheDocument();
  });

  // ── First click: prompt only ────────────────────────────────────────
  it('does not send the panic command when Panic is clicked', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmPanicControl address={ALARM_ADDR} />);

    openPrompt();

    await waitFor(() => {
      expect(screen.getByTestId('alarm-panic-confirm-prompt')).toBeInTheDocument();
    });
    expect(mockBridgeRequest).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('replaces the Panic button with a warning that names the consequences', () => {
    render(<AlarmPanicControl address={ALARM_ADDR} />);
    openPrompt();

    expect(screen.queryByTestId('alarm-panic')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Trigger a panic alarm?' })).toHaveAccessibleDescription(
      /sets off your alarm.*notification list.*professional monitoring.*dispatch emergency responders/s,
    );
    expect(screen.getByTestId('alarm-panic-confirm')).toHaveTextContent('Yes, Trigger Panic Alarm');
  });

  it('moves focus to Cancel, not to the confirm button', () => {
    render(<AlarmPanicControl address={ALARM_ADDR} />);
    openPrompt();
    expect(screen.getByTestId('alarm-panic-cancel')).toHaveFocus();
  });

  // ── Confirm: success ────────────────────────────────────────────────
  it('sends AlarmSubsystem.CMD_PANIC exactly once after confirming', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmPanicControl address={ALARM_ADDR} />);

    openPrompt();
    fireEvent.click(screen.getByTestId('alarm-panic-confirm'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(AlarmSubsystem.CMD_PANIC, ALARM_ADDR, {});
    });
    expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
  });

  it('closes the prompt after the panic is sent', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AlarmPanicControl address={ALARM_ADDR} />);

    openPrompt();
    fireEvent.click(screen.getByTestId('alarm-panic-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('alarm-panic')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('alarm-panic-confirm-prompt')).not.toBeInTheDocument();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  // ── Confirm: in flight ──────────────────────────────────────────────
  it('disables both buttons while the request is in flight', async () => {
    const resolve = deferredRequest();
    render(<AlarmPanicControl address={ALARM_ADDR} />);

    openPrompt();
    fireEvent.click(screen.getByTestId('alarm-panic-confirm'));

    expect(screen.getByTestId('alarm-panic-confirm')).toBeDisabled();
    expect(screen.getByTestId('alarm-panic-confirm')).toHaveTextContent('Triggering...');
    expect(screen.getByTestId('alarm-panic-cancel')).toBeDisabled();

    resolve();
    await waitFor(() => {
      expect(screen.getByTestId('alarm-panic')).toBeInTheDocument();
    });
  });

  it('sends only once when the confirm button is double-clicked', async () => {
    const resolve = deferredRequest();
    render(<AlarmPanicControl address={ALARM_ADDR} />);

    openPrompt();
    fireEvent.click(screen.getByTestId('alarm-panic-confirm'));
    fireEvent.click(screen.getByTestId('alarm-panic-confirm'));

    expect(mockBridgeRequest).toHaveBeenCalledTimes(1);

    resolve();
    await waitFor(() => {
      expect(screen.getByTestId('alarm-panic')).toBeInTheDocument();
    });
    expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
  });

  // ── Cancel ──────────────────────────────────────────────────────────
  it('sends nothing and restores the Panic button on Cancel', async () => {
    render(<AlarmPanicControl address={ALARM_ADDR} />);

    openPrompt();
    fireEvent.click(screen.getByTestId('alarm-panic-cancel'));

    expect(screen.getByTestId('alarm-panic')).toBeInTheDocument();
    expect(screen.queryByTestId('alarm-panic-confirm-prompt')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  it('asks again after a cancel instead of remembering the first click', () => {
    render(<AlarmPanicControl address={ALARM_ADDR} />);

    openPrompt();
    fireEvent.click(screen.getByTestId('alarm-panic-cancel'));
    openPrompt();

    expect(screen.getByTestId('alarm-panic-confirm-prompt')).toBeInTheDocument();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  // ── Confirm: failure ────────────────────────────────────────────────
  it('dispatches an error notification and keeps the prompt open on failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<AlarmPanicControl address={ALARM_ADDR} />);

    openPrompt();
    fireEvent.click(screen.getByTestId('alarm-panic-confirm'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to trigger panic alarm' },
      });
    });
    expect(screen.getByTestId('alarm-panic-confirm-prompt')).toBeInTheDocument();
    expect(screen.getByTestId('alarm-panic-confirm')).toBeEnabled();
    expect(screen.getByTestId('alarm-panic-cancel')).toBeEnabled();
  });
});
