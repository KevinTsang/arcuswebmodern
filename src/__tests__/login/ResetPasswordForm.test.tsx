import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetPasswordForm } from '@/components/login/ResetPasswordForm';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockPush, back: mockBack }),
  useSearchParams: () => mockSearchParams,
}));

const mockResetPassword = jest.fn();

jest.mock('@arcus/core/services', () => ({
  PersonService: {
    ResetPassword: (email: string, token: string, password: string) =>
      mockResetPassword(email, token, password),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

interface ResetValues {
  email?: string;
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
}

function fillForm({
  email = 'alex@example.com',
  code = '123456',
  newPassword = 'abcd1234',
  confirmPassword = newPassword,
}: ResetValues = {}) {
  const emailField = screen.queryByLabelText('Email Address');
  if (emailField) fireEvent.change(emailField, { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Enter Code'), { target: { value: code } });
  fireEvent.change(screen.getByLabelText('New Password'), { target: { value: newPassword } });
  fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: confirmPassword } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockResetPassword.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ResetPasswordForm', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<ResetPasswordForm />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot after sending a code', () => {
    mockSearchParams = new URLSearchParams('email=alex%40example.com&fromSendCode=1');
    const { asFragment } = render(<ResetPasswordForm />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('asks for the email when opened with a code from Support', () => {
      render(<ResetPasswordForm />);
      expect(screen.getByRole('heading', { name: 'Already have a code from Support?' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toHaveValue('');
      expect(screen.queryByTestId('reset-check-inbox')).not.toBeInTheDocument();
    });

    it('prefills the email from the query', () => {
      mockSearchParams = new URLSearchParams('email=alex%40example.com');
      render(<ResetPasswordForm />);
      expect(screen.getByLabelText('Email Address')).toHaveValue('alex@example.com');
    });

    it('shows "Check Your Inbox" and hides the email field after sending a code', () => {
      mockSearchParams = new URLSearchParams('email=alex%40example.com&fromSendCode=1');
      render(<ResetPasswordForm />);
      expect(screen.getByTestId('reset-check-inbox')).toHaveTextContent('Check Your Inbox');
      expect(screen.getByText('alex@example.com')).toBeInTheDocument();
      expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();
    });

    it('lists the password rules', () => {
      render(<ResetPasswordForm />);
      expect(screen.getByText('Must be at least 8 characters in length')).toBeInTheDocument();
      expect(screen.getByText('Cannot be your email address')).toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('resets the password and shows the confirmation', async () => {
      render(<ResetPasswordForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('reset-submit'));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login?view=reset-confirmation'));
      expect(mockResetPassword).toHaveBeenCalledWith('alex@example.com', '123456', 'abcd1234');
    });

    it('uses the prefilled email after sending a code', async () => {
      mockSearchParams = new URLSearchParams('email=sam%40example.com&fromSendCode=1');
      render(<ResetPasswordForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('reset-submit'));

      await waitFor(() => expect(mockResetPassword).toHaveBeenCalledWith('sam@example.com', '123456', 'abcd1234'));
    });

    it('shows "Saving Password..." and disables the button while saving', async () => {
      mockResetPassword.mockReturnValueOnce(new Promise(() => {}));
      render(<ResetPasswordForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('reset-submit'));

      await waitFor(() => expect(screen.getByTestId('reset-submit')).toBeDisabled());
      expect(screen.getByTestId('reset-submit')).toHaveTextContent('Saving Password...');
    });

    it('shows a readable message for a wrong or expired code', async () => {
      mockResetPassword.mockRejectedValueOnce({
        code: 'person.reset.token_failed',
        message: "Unable to reset password because reset token doesn't match, perhaps try again.",
      });
      render(<ResetPasswordForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('reset-submit'));

      await waitFor(() =>
        expect(screen.getByTestId('reset-error')).toHaveTextContent(
          'That code is invalid or has expired. Check the code, or request a new one.',
        ),
      );
      expect(screen.getByTestId('reset-submit')).not.toBeDisabled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('never shows raw platform text for an unknown error', async () => {
      mockResetPassword.mockRejectedValueOnce(new Error('Request failed: 500 Internal Server Error'));
      render(<ResetPasswordForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('reset-submit'));

      await waitFor(() =>
        expect(screen.getByTestId('reset-error')).toHaveTextContent('An error occurred. Please try again.'),
      );
      expect(screen.queryByText(/Request failed/)).not.toBeInTheDocument();
    });

    it('shows a generic error when the failure has no message', async () => {
      mockResetPassword.mockRejectedValueOnce(undefined);
      render(<ResetPasswordForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('reset-submit'));

      await waitFor(() =>
        expect(screen.getByTestId('reset-error')).toHaveTextContent('An error occurred. Please try again.'),
      );
    });

    it('returns to the send-code step when Back is clicked, even without browser history', () => {
      render(<ResetPasswordForm />);
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(mockPush).toHaveBeenCalledWith('/login?view=send-code');
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('rejects the email address as the new password in any letter case', () => {
      render(<ResetPasswordForm />);
      fillForm({ email: 'Alex1@Example.com', newPassword: 'alex1@example.com' });
      fireEvent.click(screen.getByTestId('reset-submit'));

      expect(screen.getByText('cannot be your email address')).toBeInTheDocument();
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows the email field after sending a code when the link has no email', () => {
      mockSearchParams = new URLSearchParams('fromSendCode=1');
      render(<ResetPasswordForm />);

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.queryByTestId('reset-check-inbox')).not.toBeInTheDocument();
      expect(screen.getByText('Enter Your Reset Code')).toBeInTheDocument();
    });

    it('shows the email field and its error after sending a code when the link email is invalid', () => {
      mockSearchParams = new URLSearchParams('fromSendCode=1&email=not-an-email');
      render(<ResetPasswordForm />);
      const emailField = screen.getByLabelText('Email Address');
      fireEvent.blur(emailField);

      expect(emailField).toHaveValue('not-an-email');
      expect(screen.getByText('is invalid')).toBeInTheDocument();
    });

    it('keeps the email field hidden after sending a code when the link email is valid', () => {
      mockSearchParams = new URLSearchParams('fromSendCode=1&email=alex%40example.com');
      render(<ResetPasswordForm />);

      expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();
      expect(screen.getByTestId('reset-check-inbox')).toBeInTheDocument();
    });

    it('does not submit an empty form', () => {
      render(<ResetPasswordForm />);
      fireEvent.click(screen.getByTestId('reset-submit'));

      expect(mockResetPassword).not.toHaveBeenCalled();
      expect(screen.getAllByText("can't be blank")).toHaveLength(4);
    });

    it('rejects mismatched passwords', () => {
      render(<ResetPasswordForm />);
      fillForm({ confirmPassword: 'abcd12345' });
      fireEvent.click(screen.getByTestId('reset-submit'));

      expect(mockResetPassword).not.toHaveBeenCalled();
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('rejects a password that is too short on blur', () => {
      render(<ResetPasswordForm />);
      fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'ab1' } });
      fireEvent.blur(screen.getByLabelText('New Password'));

      expect(screen.getByText('must be at least 8 characters')).toBeInTheDocument();
    });

    it('rejects the email address as the new password', () => {
      render(<ResetPasswordForm />);
      fillForm({ email: 'alex1@example.com', newPassword: 'alex1@example.com' });
      fireEvent.click(screen.getByTestId('reset-submit'));

      expect(mockResetPassword).not.toHaveBeenCalled();
      expect(screen.getByText('cannot be your email address')).toBeInTheDocument();
    });

    it('flags a blank code on blur', () => {
      render(<ResetPasswordForm />);
      fireEvent.blur(screen.getByLabelText('Enter Code'));

      expect(screen.getByText("can't be blank")).toBeInTheDocument();
    });
  });
});
