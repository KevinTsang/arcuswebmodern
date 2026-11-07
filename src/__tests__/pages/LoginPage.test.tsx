import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { saveNextPage } from '@/lib/nextPage';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

const mockLoginUnwrap = jest.fn();
const mockPasskeyUnwrap = jest.fn();
const mockPlaceUnwrap = jest.fn();
const mockDispatch = jest.fn((action: { type: string }) => ({
  unwrap: () => {
    if (action.type === 'auth/login') return mockLoginUnwrap();
    if (action.type === 'auth/passkeyLogin') return mockPasskeyUnwrap();
    return mockPlaceUnwrap();
  },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: jest.fn(),
}));

jest.mock('@/store/thunks/loginThunk', () => ({
  loginThunk: (args: unknown) => ({ type: 'auth/login', payload: args }),
}));

jest.mock('@/store/thunks/passkeyLoginThunk', () => ({
  passkeyLoginThunk: (args: unknown) => ({ type: 'auth/passkeyLogin', payload: args }),
}));

let mockPasskeyAvailable = false;

jest.mock('@/hooks/usePasskeyLoginAvailable', () => ({
  usePasskeyLoginAvailable: () => mockPasskeyAvailable,
}));

jest.mock('@/store/thunks/loadPlaceDataThunk', () => ({
  loadPlaceDataThunk: (placeId: string) => ({ type: 'place/loadData', payload: placeId }),
}));

jest.mock('@arcus/core/services', () => ({
  PersonService: { SendPasswordReset: jest.fn(), ChangePassword: jest.fn() },
}));

// ── Helpers ───────────────────────────────────────────────────────────

function submitLogin() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
  fireEvent.click(screen.getByTestId('login-submit'));
}

/** A promise the test settles itself, to look at the page mid-login. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockSearchParams = new URLSearchParams();
  mockPasskeyAvailable = false;
  mockLoginUnwrap.mockResolvedValue({ session: {}, placeId: 'place-1' });
  mockPasskeyUnwrap.mockResolvedValue({ session: {}, placeId: 'place-1' });
  mockPlaceUnwrap.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<LoginPage />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('returns to the page remembered before login, including its query', async () => {
    saveNextPage('/devices?device=DRIV:dev:1');
    render(<LoginPage />);
    submitLogin();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/devices?device=DRIV:dev:1'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'place/loadData', payload: 'place-1' });
    expect(sessionStorage.getItem('arcus:nextPage')).toBeNull();
  });

  it('goes to the home page when no page was remembered', async () => {
    render(<LoginPage />);
    submitLogin();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('ignores a redirect query param', async () => {
    mockSearchParams = new URLSearchParams('redirect=//evil.example/login');
    render(<LoginPage />);
    submitLogin();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('shows an error and stays on the page when login fails', async () => {
    saveNextPage('/scenes');
    mockLoginUnwrap.mockRejectedValue(new Error('Authentication failed'));
    render(<LoginPage />);
    submitLogin();

    await waitFor(() =>
      expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid username or password'),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    // The remembered page survives a failed attempt.
    expect(sessionStorage.getItem('arcus:nextPage')).toBe('/scenes');
  });

  describe('passkey login', () => {
    beforeEach(() => {
      mockPasskeyAvailable = true;
    });

    it('is not offered when passkeys are unavailable', () => {
      mockPasskeyAvailable = false;
      render(<LoginPage />);

      expect(screen.queryByTestId('passkey-login')).not.toBeInTheDocument();
    });

    it('is offered beside Login when passkeys are available', () => {
      render(<LoginPage />);

      expect(screen.getByTestId('passkey-login')).toHaveTextContent('Log In With a Passkey');
      expect(screen.getByTestId('passkey-login')).toHaveAttribute('type', 'button');
    });

    it('logs in without an email or password and returns to the remembered page', async () => {
      saveNextPage('/scenes');
      render(<LoginPage />);
      fireEvent.click(screen.getByTestId('passkey-login'));

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/scenes'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'auth/passkeyLogin', payload: { isPublic: false } });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'place/loadData', payload: 'place-1' });
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'auth/login' }));
    });

    it('passes the public computer flag', async () => {
      render(<LoginPage />);
      fireEvent.click(screen.getByLabelText('I am on a public computer'));
      fireEvent.click(screen.getByTestId('passkey-login'));

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'auth/passkeyLogin', payload: { isPublic: true } }),
      );
    });

    it('skips loading place data when the session has no place', async () => {
      mockPasskeyUnwrap.mockResolvedValueOnce({ session: {}, placeId: undefined });
      render(<LoginPage />);
      fireEvent.click(screen.getByTestId('passkey-login'));

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'place/loadData' }));
    });

    it('waits for the passkey with both login buttons disabled', async () => {
      const login = deferred<{ session: object; placeId: string }>();
      mockPasskeyUnwrap.mockReturnValueOnce(login.promise);
      render(<LoginPage />);
      fireEvent.click(screen.getByTestId('passkey-login'));

      expect(screen.getByTestId('passkey-login')).toHaveTextContent('Waiting for Passkey...');
      expect(screen.getByTestId('passkey-login')).toBeDisabled();
      expect(screen.getByTestId('login-submit')).toBeDisabled();

      await act(async () => login.resolve({ session: {}, placeId: 'place-1' }));
      expect(mockReplace).toHaveBeenCalledWith('/');
    });

    it('does not submit the password form while waiting for the passkey', () => {
      mockPasskeyUnwrap.mockReturnValueOnce(new Promise(() => {}));
      render(<LoginPage />);
      fireEvent.click(screen.getByTestId('passkey-login'));
      submitLogin();

      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'auth/login' }));
    });

    it('disables the passkey button while a password login runs', () => {
      mockLoginUnwrap.mockReturnValueOnce(new Promise(() => {}));
      render(<LoginPage />);
      submitLogin();

      expect(screen.getByTestId('passkey-login')).toBeDisabled();
    });

    it('explains the failure, stays on the page and lets the person try again', async () => {
      saveNextPage('/scenes');
      mockPasskeyUnwrap.mockRejectedValueOnce('no-passkey');
      render(<LoginPage />);
      fireEvent.click(screen.getByTestId('passkey-login'));

      await waitFor(() =>
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'No passkey was used. Please try again, or log in with your password.',
        ),
      );
      expect(screen.getByTestId('passkey-login')).toBeEnabled();
      expect(screen.getByTestId('passkey-login')).toHaveTextContent('Log In With a Passkey');
      expect(screen.getByTestId('login-submit')).toBeEnabled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('arcus:nextPage')).toBe('/scenes');
    });

    it('says nothing when the passkey prompt was cancelled, clearing an earlier error', async () => {
      mockLoginUnwrap.mockRejectedValueOnce(new Error('Authentication failed'));
      mockPasskeyUnwrap.mockRejectedValueOnce('cancelled');
      render(<LoginPage />);
      submitLogin();
      await screen.findByTestId('login-error');

      fireEvent.click(screen.getByTestId('passkey-login'));

      await waitFor(() => expect(screen.getByTestId('passkey-login')).toBeEnabled());
      expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
    });

    it('gives the generic message when loading the place fails after logging in', async () => {
      mockPlaceUnwrap.mockRejectedValueOnce(new Error('Place load failed'));
      render(<LoginPage />);
      fireEvent.click(screen.getByTestId('passkey-login'));

      await waitFor(() =>
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'Something went wrong while signing in. Please try again.',
        ),
      );
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
