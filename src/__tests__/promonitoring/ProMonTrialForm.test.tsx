import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProMonitoringSettings } from '@arcus/core';
import { ProMonTrialForm } from '@/components/promonitoring/ProMonTrialForm';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();

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

const SETTINGS_ADDR = 'SERV:promon:place-1';
const onJoined = jest.fn();

function renderForm() {
  return render(<ProMonTrialForm settingsAddress={SETTINGS_ADDR} onJoined={onJoined} />);
}

function submitCode(code: string) {
  fireEvent.change(screen.getByTestId('promon-trial-code'), { target: { value: code } });
  fireEvent.click(screen.getByTestId('promon-trial-submit'));
}

const ERROR_NOTIFICATION = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'That Professional Monitoring code was not accepted.' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ProMonTrialForm', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderForm();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('explains that monitoring is invite only', () => {
      renderForm();
      expect(screen.getByText(/available in limited areas and is invite only/)).toBeInTheDocument();
    });

    it('links to the code request page in a new tab', () => {
      renderForm();
      const link = screen.getByTestId('promon-trial-request-link');
      expect(link).toHaveAttribute('href', 'https://www.arcus.com/monitoring/');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('masks the code field', () => {
      renderForm();
      expect(screen.getByLabelText('Code')).toHaveAttribute('type', 'password');
    });

    it('shows Submit and no error at first', () => {
      renderForm();
      expect(screen.getByTestId('promon-trial-submit')).toHaveTextContent('Submit');
      expect(screen.queryByTestId('promon-trial-error')).not.toBeInTheDocument();
    });
  });

  describe('joining the trial', () => {
    it('sends the trimmed code and reports success', async () => {
      renderForm();
      submitCode('  PROMON-7 ');
      await waitFor(() => expect(onJoined).toHaveBeenCalledTimes(1));
      expect(mockBridgeRequest).toHaveBeenCalledWith(ProMonitoringSettings.CMD_JOINTRIAL, SETTINGS_ADDR, { code: 'PROMON-7' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Trial code accepted.' },
      });
    });

    it('shows Saving while the request is pending', async () => {
      let resolve: (v: object) => void = () => {};
      mockBridgeRequest.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
      renderForm();
      submitCode('PROMON-7');
      expect(screen.getByTestId('promon-trial-submit')).toHaveTextContent('Saving…');
      expect(screen.getByTestId('promon-trial-submit')).toBeDisabled();
      resolve({});
      await waitFor(() => expect(onJoined).toHaveBeenCalled());
    });

    it('shows an error and offers to try again when the code is refused', async () => {
      mockBridgeRequest.mockRejectedValueOnce({ code: 'error.code.invalid', message: 'Invalid' });
      renderForm();
      submitCode('WRONG');
      expect(await screen.findByTestId('promon-trial-error')).toHaveTextContent(
        'If you received an invitation, please enter the code again.',
      );
      expect(screen.getByTestId('promon-trial-submit')).toHaveTextContent('Try Again');
      expect(mockDispatch).toHaveBeenCalledWith(ERROR_NOTIFICATION);
      expect(onJoined).not.toHaveBeenCalled();
    });

    it('changes the message after a second failure', async () => {
      mockBridgeRequest.mockRejectedValue(new Error('fail'));
      renderForm();
      submitCode('WRONG');
      await screen.findByText(/please enter the code again/);
      fireEvent.click(screen.getByTestId('promon-trial-submit'));
      expect(await screen.findByText(/It looks like the code is still invalid/)).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledTimes(2);
    });

    it('submits with the Enter key', async () => {
      renderForm();
      fireEvent.change(screen.getByTestId('promon-trial-code'), { target: { value: 'PROMON-7' } });
      fireEvent.submit(screen.getByTestId('promon-trial-form'));
      await waitFor(() => expect(onJoined).toHaveBeenCalled());
    });
  });

  describe('edge cases', () => {
    it('disables Submit until a code is entered', () => {
      renderForm();
      expect(screen.getByTestId('promon-trial-submit')).toBeDisabled();
      fireEvent.change(screen.getByTestId('promon-trial-code'), { target: { value: '   ' } });
      expect(screen.getByTestId('promon-trial-submit')).toBeDisabled();
    });

    it('does not send a blank code when the form is submitted', () => {
      renderForm();
      fireEvent.submit(screen.getByTestId('promon-trial-form'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });
});
