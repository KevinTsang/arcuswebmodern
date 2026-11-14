import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/login/LoginForm';
import { saveNextPage } from '@/lib/nextPage';
import { addNotification } from '@/store/slices/uiSlice';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

const mockLoginUnwrap = jest.fn();
const mockLoadPlaceUnwrap = jest.fn();
const mockDispatch = jest.fn((action: { type: string }) => ({
  unwrap: () => (action.type === 'auth/login' ? mockLoginUnwrap() : mockLoadPlaceUnwrap()),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/thunks/loginThunk', () => ({
  loginThunk: (args: { username: string; password: string; isPublic: boolean }) => ({
    type: 'auth/login',
    payload: args,
  }),
}));

jest.mock('@/store/thunks/loadPlaceDataThunk', () => ({
  loadPlaceDataThunk: (placeId: string) => ({ type: 'place/loadData', payload: placeId }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function fillForm(email = 'alex@example.com', password = 'secret') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockSearchParams = new URLSearchParams();
  mockLoginUnwrap.mockResolvedValue({ session: {}, placeId: 'place-1' });
  mockLoadPlaceUnwrap.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<LoginForm />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('renders the fields, submit button and links', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText('I am on a public computer')).not.toBeChecked();
      expect(screen.getByTestId('login-submit')).toHaveTextContent('Login');
      expect(screen.getByRole('link', { name: 'Create An Account' })).toHaveAttribute('href', '/create-account');
      expect(screen.getByRole('link', { name: 'Use Invitation Code' })).toHaveAttribute('href', '/invite');
      expect(screen.getByRole('link', { name: 'Forgot Password?' })).toHaveAttribute(
        'href',
        '/login?view=send-code',
      );
    });

    it('does not show the session-expired notice by default', () => {
      render(<LoginForm />);
      expect(screen.queryByTestId('session-expired-notice')).not.toBeInTheDocument();
    });

    it('shows the session-expired notice when expired=1', () => {
      mockSearchParams = new URLSearchParams('expired=1');
      render(<LoginForm />);
      expect(screen.getByTestId('session-expired-notice')).toHaveTextContent('Your session has expired');
    });
  });

  describe('submitting', () => {
    it('logs in, loads the place and goes home', async () => {
      render(<LoginForm />);
      fillForm();
      fireEvent.click(screen.getByLabelText('I am on a public computer'));
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'auth/login',
        payload: { username: 'alex@example.com', password: 'secret', isPublic: true },
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'place/loadData', payload: 'place-1' });
    });

    it('returns to the page remembered before login', async () => {
      saveNextPage('/scenes');
      render(<LoginForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/scenes'));
    });

    it('skips loading place data when the login returns no place', async () => {
      mockLoginUnwrap.mockResolvedValueOnce({ session: {} });
      render(<LoginForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'place/loadData' }));
    });

    it('shows "Logging In..." and disables the button while saving', async () => {
      mockLoginUnwrap.mockReturnValueOnce(new Promise(() => {}));
      render(<LoginForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => expect(screen.getByTestId('login-submit')).toBeDisabled());
      expect(screen.getByTestId('login-submit')).toHaveTextContent('Logging In...');
    });

    it('shows an error and re-enables the button when login fails', async () => {
      mockLoginUnwrap.mockRejectedValueOnce(new Error('Authentication failed'));
      render(<LoginForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() =>
        expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid username or password'),
      );
      expect(screen.getByTestId('login-submit')).not.toBeDisabled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('continues into the app and shows a notification when loading the place fails', async () => {
      mockLoadPlaceUnwrap.mockRejectedValueOnce(new Error('load failed'));
      render(<LoginForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: addNotification.type,
          payload: expect.objectContaining({
            type: 'error',
            message: 'Signed in, but your place could not be loaded. Try refreshing the page.',
          }),
        }),
      );
      expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
    });

    it('does not load the place or show a notification when login fails', async () => {
      mockLoginUnwrap.mockRejectedValueOnce(new Error('bad credentials'));
      render(<LoginForm />);
      fillForm();
      fireEvent.click(screen.getByTestId('login-submit'));

      await waitFor(() =>
        expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid username or password'),
      );
      expect(mockLoadPlaceUnwrap).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: addNotification.type }));
    });
  });

  describe('validation', () => {
    it('does not submit an empty form and shows field errors', () => {
      render(<LoginForm />);
      fireEvent.click(screen.getByTestId('login-submit'));

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(screen.getAllByText("can't be blank")).toHaveLength(2);
    });

    it('flags an invalid email on blur', () => {
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
      fireEvent.blur(screen.getByLabelText('Email'));

      expect(screen.getByText('is invalid')).toBeInTheDocument();
    });

    it('flags a blank password on blur', () => {
      render(<LoginForm />);
      fireEvent.blur(screen.getByLabelText('Password'));

      expect(screen.getByText("can't be blank")).toBeInTheDocument();
    });

    it('does not submit with an invalid email', () => {
      render(<LoginForm />);
      fillForm('bad-email');
      // The browser's own email check blocks the submit before the form's validation runs.
      fireEvent.click(screen.getByTestId('login-submit'));

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
