import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Person } from '@arcus/core';
import ChangeEmailPanel from '@/components/settings/ChangeEmailPanel';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const onSaved = jest.fn();

function renderPanel(currentEmail = 'alex@example.com') {
  return render(<ChangeEmailPanel personId="p1" currentEmail={currentEmail} onSaved={onSaved} />);
}

function fill(email: string, confirm = email) {
  fireEvent.change(screen.getByLabelText('New Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Confirm New Email'), { target: { value: confirm } });
}

const save = () => fireEvent.click(screen.getByTestId('change-email-save'));

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ChangeEmailPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderPanel();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the current email', () => {
      renderPanel();
      expect(screen.getByTestId('change-email-current')).toHaveTextContent('alex@example.com');
    });

    it('shows a dash with no current email', () => {
      renderPanel('');
      expect(screen.getByTestId('change-email-current')).toHaveTextContent('—');
    });

    it('disables Change Email until both fields are filled', () => {
      renderPanel();
      expect(screen.getByTestId('change-email-save')).toBeDisabled();
      fireEvent.change(screen.getByLabelText('New Email'), { target: { value: 'a@b.co' } });
      expect(screen.getByTestId('change-email-save')).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Confirm New Email'), { target: { value: 'a@b.co' } });
      expect(screen.getByTestId('change-email-save')).not.toBeDisabled();
    });
  });

  describe('saving', () => {
    it('saves the trimmed email, reports it and closes', async () => {
      renderPanel();
      fill(' new@example.com ', 'new@example.com');
      save();

      await waitFor(() =>
        expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, 'SERV:person:p1', {
          [Person.ATTR_EMAIL]: 'new@example.com',
        }));
      expect(onSaved).toHaveBeenCalledWith('new@example.com');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Email changed. Use it the next time you sign in.' },
      });
      expect(mockCloseRight).toHaveBeenCalled();
    });

    it('rejects an invalid email', async () => {
      renderPanel();
      fill('not-an-email');
      save();
      expect(await screen.findByTestId('field-new-email-error')).toHaveTextContent('is invalid');
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('rejects a confirmation that does not match', async () => {
      renderPanel();
      fill('new@example.com', 'other@example.com');
      save();
      expect(await screen.findByTestId('field-confirm-new-email-error')).toHaveTextContent('Emails do not match');
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('rejects the current email, ignoring case', async () => {
      renderPanel();
      fill('ALEX@example.com');
      save();
      expect(await screen.findByTestId('field-new-email-error')).toHaveTextContent('is already your email');
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('explains an email that is already in use', async () => {
      mockBridgeRequest.mockRejectedValueOnce({ code: 'error.signup.emailinuse', message: 'in use' });
      renderPanel();
      fill('taken@example.com');
      save();

      expect(await screen.findByTestId('change-email-error')).toHaveTextContent('already used by another account');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to change email.' },
      });
      expect(onSaved).not.toHaveBeenCalled();
      expect(mockCloseRight).not.toHaveBeenCalled();
    });

    it('shows a generic error for other failures', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      renderPanel();
      fill('new@example.com');
      save();

      expect(await screen.findByTestId('change-email-error')).toHaveTextContent('Unable to change your email');
      expect(screen.getByTestId('change-email-save')).not.toBeDisabled();
    });

    it('closes on Cancel', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockCloseRight).toHaveBeenCalled();
    });
  });
});
