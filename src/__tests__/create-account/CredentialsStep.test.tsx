import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CredentialsStep from '@/components/create-account/CredentialsStep';
import { CreateAccountProvider } from '@/components/create-account/CreateAccountContext';
import { AccountService } from '@arcus/core/services';
import auth from '@arcus/core/auth';

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => null,
  useAppDispatch: () => jest.fn(),
}));

jest.mock('@arcus/core/services', () => ({
  AccountService: { CreateAccount: jest.fn() },
}));

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: {
    on: jest.fn(),
    off: jest.fn(),
    authenticate: jest.fn(),
  },
}));

jest.mock('@/store/slices/authSlice', () => ({
  loginSuccess: jest.fn(() => ({ type: 'auth/loginSuccess' })),
}));

jest.mock('@/store/thunks/initConfig', () => ({
  initializeCoreConfig: jest.fn(),
}));

function renderStep() {
  return render(
    <CreateAccountProvider>
      <CredentialsStep />
    </CreateAccountProvider>,
  );
}

describe('CredentialsStep', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all form fields', () => {
    renderStep();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('renders opt-in checkbox', () => {
    renderStep();
    expect(screen.getByLabelText('Keep me up to date with news and offers')).toBeInTheDocument();
  });

  it('renders Create Account button', () => {
    renderStep();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('updates field values on input', () => {
    renderStep();
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('toggles opt-in checkbox', () => {
    renderStep();
    const checkbox = screen.getByLabelText('Keep me up to date with news and offers');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('calls AccountService.CreateAccount on valid submit', async () => {
    (AccountService.CreateAccount as jest.Mock).mockResolvedValue({ placeId: 'p1', account: {} });
    (auth.authenticate as jest.Mock).mockResolvedValue(undefined);
    (auth.on as jest.Mock).mockImplementation((event: string, cb: (data?: any) => void) => {
      if (event === 'authentication:success') {
        setTimeout(() => cb({ 'person:currPlace': 'p1', 'base:address': 'SERV:person:p1' }), 0);
      }
    });

    renderStep();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(AccountService.CreateAccount).toHaveBeenCalled();
    });
  });

  // ── Unsuccessful account creation ──────────────────────────────────

  function fillValidForm() {
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password1' } });
  }

  it('does not call CreateAccount when required fields are empty', async () => {
    renderStep();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    // Wait a tick to ensure any async submit would have fired
    await waitFor(() => {
      expect(AccountService.CreateAccount).not.toHaveBeenCalled();
    });
  });

  it('does not call CreateAccount when only some fields are filled', async () => {
    renderStep();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    // lastName, password, confirmPassword left empty

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(AccountService.CreateAccount).not.toHaveBeenCalled();
    });
  });

  it('does not call CreateAccount when passwords do not match', async () => {
    renderStep();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'different1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(AccountService.CreateAccount).not.toHaveBeenCalled();
    });
  });

  it('does not call CreateAccount when password is too short', async () => {
    renderStep();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ab1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'ab1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(AccountService.CreateAccount).not.toHaveBeenCalled();
    });
  });

  it('does not call CreateAccount when email is invalid', async () => {
    renderStep();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(AccountService.CreateAccount).not.toHaveBeenCalled();
    });
  });

  it('shows loading state on button while submitting', async () => {
    // CreateAccount never resolves so we stay in loading state
    (AccountService.CreateAccount as jest.Mock).mockReturnValue(new Promise(() => {}));

    renderStep();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Creating Account/i })).toBeDisabled();
    });
  });

  it('re-enables button after CreateAccount API failure', async () => {
    (AccountService.CreateAccount as jest.Mock).mockRejectedValue(new Error('Email already in use'));

    renderStep();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Account' })).not.toBeDisabled();
    });
  });

  it('re-enables button after authentication failure', async () => {
    (AccountService.CreateAccount as jest.Mock).mockResolvedValue({ placeId: 'p1', account: {} });
    (auth.authenticate as jest.Mock).mockResolvedValue(undefined);
    (auth.on as jest.Mock).mockImplementation((event: string, cb: (data?: any) => void) => {
      if (event === 'authentication:fail') {
        setTimeout(() => cb(), 0);
      }
    });

    renderStep();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Account' })).not.toBeDisabled();
    });
  });

  it('re-enables button when auth.authenticate rejects', async () => {
    (AccountService.CreateAccount as jest.Mock).mockResolvedValue({ placeId: 'p1', account: {} });
    (auth.authenticate as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    renderStep();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Account' })).not.toBeDisabled();
    });
  });
});
