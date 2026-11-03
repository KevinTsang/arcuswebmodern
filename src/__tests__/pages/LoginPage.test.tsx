import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
const mockDispatch = jest.fn((action: { type: string }) => ({
  unwrap: () => (action.type === 'auth/login' ? mockLoginUnwrap() : Promise.resolve()),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: jest.fn(),
}));

jest.mock('@/store/thunks/loginThunk', () => ({
  loginThunk: (args: unknown) => ({ type: 'auth/login', payload: args }),
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

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockSearchParams = new URLSearchParams();
  mockLoginUnwrap.mockResolvedValue({ session: {}, placeId: 'place-1' });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  it('matches snapshot', () => {
    const { container } = render(<LoginPage />);
    expect(container.firstChild).toMatchSnapshot();
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
});
