import { render, screen, waitFor, act } from '@testing-library/react';
import AuthProvider from '@/components/AuthProvider';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
let mockPathname = '/home';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

const mockDispatch = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
let mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: any) => any) => sel({ auth: mockAuthState }),
}));

jest.mock('@/store/thunks/authenticateThunk', () => ({
  authenticateThunk: () => ({ type: 'auth/authenticate' }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function renderAuthProvider(children: React.ReactNode = <div>Protected Content</div>) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/home';
  mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
});

describe('AuthProvider', () => {
  it('dispatches authenticateThunk on mount', () => {
    renderAuthProvider();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/authenticate' }),
    );
  });

  it('shows loading state on protected routes while not authenticated', () => {
    mockPathname = '/home';
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    renderAuthProvider();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows loading state while authenticating on protected routes', () => {
    mockPathname = '/devices';
    mockAuthState = { authenticating: true, authenticated: false, sessionExpired: false };
    renderAuthProvider();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockAuthState = { authenticating: false, authenticated: true, sessionExpired: false };
    renderAuthProvider();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders children on public routes even when not authenticated', () => {
    mockPathname = '/login';
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    renderAuthProvider(<div>Login Page</div>);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('does not redirect before auth attempt has completed', () => {
    mockPathname = '/home';
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    renderAuthProvider();
    // On initial render, authenticating has never been true,
    // so redirect should not fire yet
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /login with redirect param after auth attempt fails on a protected route', () => {
    mockPathname = '/home';
    // Simulate: authenticating started (true), then finished (false) without success
    mockAuthState = { authenticating: true, authenticated: false, sessionExpired: false };
    const { rerender } = render(<AuthProvider><div>Protected Content</div></AuthProvider>);

    // Auth finishes, failed
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    rerender(<AuthProvider><div>Protected Content</div></AuthProvider>);

    expect(mockReplace).toHaveBeenCalledWith('/login?redirect=%2Fhome');
  });

  it('redirects to /login with expired flag when session expires', () => {
    mockPathname = '/devices';
    mockAuthState = { authenticating: true, authenticated: false, sessionExpired: false };
    const { rerender } = render(<AuthProvider><div>Protected Content</div></AuthProvider>);

    // Session expired
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: true };
    rerender(<AuthProvider><div>Protected Content</div></AuthProvider>);

    expect(mockReplace).toHaveBeenCalledWith('/login?expired=1&redirect=%2Fdevices');
  });

  it('redirects to /login without redirect param when on root path', () => {
    mockPathname = '/';
    mockAuthState = { authenticating: true, authenticated: false, sessionExpired: false };
    const { rerender } = render(<AuthProvider><div>Protected Content</div></AuthProvider>);

    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    rerender(<AuthProvider><div>Protected Content</div></AuthProvider>);

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('does not redirect after auth succeeds', () => {
    mockPathname = '/home';
    mockAuthState = { authenticating: true, authenticated: false, sessionExpired: false };
    const { rerender } = render(<AuthProvider><div>Protected Content</div></AuthProvider>);

    // Auth finishes, succeeded
    mockAuthState = { authenticating: false, authenticated: true, sessionExpired: false };
    rerender(<AuthProvider><div>Protected Content</div></AuthProvider>);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('does not redirect on public routes even after auth fails', () => {
    mockPathname = '/login';
    mockAuthState = { authenticating: true, authenticated: false, sessionExpired: false };
    const { rerender } = render(<AuthProvider><div>Login Page</div></AuthProvider>);

    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    rerender(<AuthProvider><div>Login Page</div></AuthProvider>);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('treats /login as a public route', () => {
    mockPathname = '/login';
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    renderAuthProvider(<div>Public Content</div>);
    expect(screen.getByText('Public Content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('treats /create-account as a public route', () => {
    mockPathname = '/create-account';
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    renderAuthProvider(<div>Public Content</div>);
    expect(screen.getByText('Public Content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('treats /invite as a public route', () => {
    mockPathname = '/invite';
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    renderAuthProvider(<div>Public Content</div>);
    expect(screen.getByText('Public Content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('treats sub-paths of public routes as public', () => {
    mockPathname = '/create-account/step2';
    mockAuthState = { authenticating: false, authenticated: false, sessionExpired: false };
    renderAuthProvider(<div>Public Sub-Path</div>);
    expect(screen.getByText('Public Sub-Path')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not dispatch authenticateThunk if already authenticated', () => {
    mockAuthState = { authenticating: false, authenticated: true, sessionExpired: false };
    renderAuthProvider();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch authenticateThunk if already authenticating', () => {
    mockAuthState = { authenticating: true, authenticated: false, sessionExpired: false };
    renderAuthProvider();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
