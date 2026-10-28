/**
 * Tests for loginThunk — credential login. The shared sign-in flow
 * (waitForSession, completeSession) is mocked here; it has its own tests in
 * src/__tests__/store/utils/sessionFlow.test.ts.
 */

import type { SessionCreatedEvent } from '@/arcus/types';
import { setAuthenticating, loginFailed } from '@/store/slices/authSlice';
import { initializeCoreConfig } from '@/store/thunks/initConfig';
import { loginThunk } from '@/store/thunks/loginThunk';
import { waitForSession, completeSession } from '@/store/utils/sessionFlow';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockLogin = jest.fn<Promise<void>, [string, string, boolean]>();

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: {
    login: (username: string, password: string, isPublic: boolean) => mockLogin(username, password, isPublic),
  },
}));

jest.mock('@/store/thunks/initConfig', () => ({ initializeCoreConfig: jest.fn() }));

jest.mock('@/store/utils/sessionFlow', () => ({
  waitForSession: jest.fn(),
  completeSession: jest.fn(),
}));

const mockInitializeCoreConfig = jest.mocked(initializeCoreConfig);
const mockWaitForSession = jest.mocked(waitForSession);
const mockCompleteSession = jest.mocked(completeSession);
const mockDispatch = jest.fn();

// ── Helpers ───────────────────────────────────────────────────────────

const creds = { username: 'user@test.com', password: 'secret', isPublic: false };

// Passed through untouched, since completeSession is mocked.
const session = { personId: 'person-1', places: [] } as SessionCreatedEvent;

function runLogin(overrides: Partial<typeof creds> = {}) {
  return loginThunk({ ...creds, ...overrides })(mockDispatch, () => ({}), undefined);
}

/** The start call the thunk handed to waitForSession. */
function startCall() {
  expect(mockWaitForSession).toHaveBeenCalledTimes(1);
  return mockWaitForSession.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLogin.mockResolvedValue(undefined);
  mockWaitForSession.mockResolvedValue(session);
  mockCompleteSession.mockResolvedValue('place-1');
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('loginThunk', () => {
  describe('on success', () => {
    it('initializes the core config', async () => {
      await runLogin();

      expect(mockInitializeCoreConfig).toHaveBeenCalledTimes(1);
    });

    it('dispatches setAuthenticating(true)', async () => {
      await runLogin();

      expect(mockDispatch).toHaveBeenCalledWith(setAuthenticating(true));
    });

    it('waits for a session with the login fail message', async () => {
      await runLogin();

      expect(mockWaitForSession).toHaveBeenCalledWith(expect.any(Function), 'Authentication failed');
    });

    it('logs in with the credentials only through the start call', async () => {
      await runLogin();
      expect(mockLogin).not.toHaveBeenCalled();

      await startCall()();

      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'secret', false);
    });

    it('passes the isPublic flag to auth.login', async () => {
      await runLogin({ isPublic: true });
      await startCall()();

      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'secret', true);
    });

    it('completes the session with the SessionCreated payload and dispatch', async () => {
      await runLogin();

      expect(mockCompleteSession).toHaveBeenCalledWith(session, mockDispatch);
    });

    it('returns { session, placeId }', async () => {
      const result = await runLogin();

      expect(result.payload).toEqual({ session, placeId: 'place-1' });
    });

    it('does not dispatch loginFailed', async () => {
      await runLogin();

      expect(mockDispatch).not.toHaveBeenCalledWith(loginFailed());
    });
  });

  describe('on failure', () => {
    it('dispatches loginFailed and rethrows when no session is established', async () => {
      mockWaitForSession.mockRejectedValue(new Error('Authentication failed'));

      await expect(runLogin().unwrap()).rejects.toMatchObject({ message: 'Authentication failed' });

      expect(mockDispatch).toHaveBeenCalledWith(loginFailed());
      expect(mockCompleteSession).not.toHaveBeenCalled();
    });

    it('dispatches loginFailed and rethrows when completing the session fails', async () => {
      mockCompleteSession.mockRejectedValue(new Error('No account found for the selected place'));

      await expect(runLogin().unwrap()).rejects.toMatchObject({ message: 'No account found for the selected place' });

      expect(mockDispatch).toHaveBeenCalledWith(loginFailed());
    });
  });
});
