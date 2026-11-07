/**
 * Tests for passkeyLoginThunk — passkey login. The shared sign-in flow
 * (waitForSession, completeSession) is mocked here; it has its own tests in
 * src/__tests__/store/utils/sessionFlow.test.ts. How each passkey error is
 * classified is covered in src/__tests__/lib/passkeyLoginFailure.test.ts.
 */

import { PasskeyRequestError } from '@arcus/core/passkey';
import type { SessionCreatedEvent } from '@/arcus/types';
import { setAuthenticating, loginFailed } from '@/store/slices/authSlice';
import { initializeCoreConfig } from '@/store/thunks/initConfig';
import { passkeyLoginThunk } from '@/store/thunks/passkeyLoginThunk';
import { waitForSession, completeSession, SessionStepError } from '@/store/utils/sessionFlow';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockLoginWithPasskey = jest.fn<Promise<void>, [boolean]>();
const mockReset = jest.fn();

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  SocketOpenError: jest.requireActual('@arcus/core/auth').SocketOpenError,
  default: {
    loginWithPasskey: (isPublic: boolean) => mockLoginWithPasskey(isPublic),
    reset: () => mockReset(),
  },
}));

jest.mock('@/store/thunks/initConfig', () => ({ initializeCoreConfig: jest.fn() }));

jest.mock('@/store/utils/sessionFlow', () => ({
  ...jest.requireActual('@/store/utils/sessionFlow'),
  waitForSession: jest.fn(),
  completeSession: jest.fn(),
}));

const mockInitializeCoreConfig = jest.mocked(initializeCoreConfig);
const mockWaitForSession = jest.mocked(waitForSession);
const mockCompleteSession = jest.mocked(completeSession);
const mockDispatch = jest.fn();

// ── Helpers ───────────────────────────────────────────────────────────

// Passed through untouched, since completeSession is mocked.
const session = { personId: 'person-1', places: [] } as SessionCreatedEvent;

function runLogin(isPublic = false) {
  return passkeyLoginThunk({ isPublic })(mockDispatch, () => ({}), undefined);
}

/** The start call the thunk handed to waitForSession. */
function startCall() {
  expect(mockWaitForSession).toHaveBeenCalledTimes(1);
  return mockWaitForSession.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoginWithPasskey.mockResolvedValue(undefined);
  mockWaitForSession.mockResolvedValue(session);
  mockCompleteSession.mockResolvedValue('place-1');
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('passkeyLoginThunk', () => {
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

    it('logs in with a passkey only through the start call', async () => {
      await runLogin();
      expect(mockLoginWithPasskey).not.toHaveBeenCalled();

      await startCall()();

      expect(mockLoginWithPasskey).toHaveBeenCalledWith(false);
    });

    it('passes the isPublic flag to auth.loginWithPasskey', async () => {
      await runLogin(true);
      await startCall()();

      expect(mockLoginWithPasskey).toHaveBeenCalledWith(true);
    });

    it('completes the session with the SessionCreated payload and dispatch', async () => {
      await runLogin();

      expect(mockCompleteSession).toHaveBeenCalledWith(session, mockDispatch);
    });

    it('returns { session, placeId }', async () => {
      const result = await runLogin();

      expect(result.payload).toEqual({ session, placeId: 'place-1' });
    });

    it('keeps the socket and does not dispatch loginFailed', async () => {
      await runLogin();

      expect(mockReset).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(loginFailed());
    });
  });

  describe('on failure', () => {
    it('tears down the socket and dispatches loginFailed when the passkey login fails', async () => {
      mockWaitForSession.mockRejectedValueOnce(
        new SessionStepError('connect', new DOMException('closed', 'NotAllowedError')),
      );

      await runLogin();

      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(loginFailed());
      expect(mockCompleteSession).not.toHaveBeenCalled();
    });

    it('rejects with how the passkey login failed', async () => {
      mockWaitForSession.mockRejectedValueOnce(new SessionStepError('connect', new PasskeyRequestError(429)));

      await expect(runLogin().unwrap()).rejects.toBe('rate-limited');
    });

    it('rejects with cancelled when the prompt was aborted', async () => {
      mockWaitForSession.mockRejectedValueOnce(
        new SessionStepError('connect', new DOMException('aborted', 'AbortError')),
      );

      await expect(runLogin().unwrap()).rejects.toBe('cancelled');
    });

    it('rejects with connection when the socket closes before the session starts', async () => {
      mockWaitForSession.mockRejectedValueOnce(new SessionStepError('SessionCreated', new Error('Authentication failed')));

      await expect(runLogin().unwrap()).rejects.toBe('connection');
    });

    it('tears down the socket and rejects with unknown when completing the session fails', async () => {
      mockCompleteSession.mockRejectedValueOnce(new SessionStepError('SetActivePlace', {}));

      await expect(runLogin().unwrap()).rejects.toBe('unknown');

      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(loginFailed());
    });

    it('classifies only the connect step as a passkey error', async () => {
      mockCompleteSession.mockRejectedValueOnce(new SessionStepError('SetActivePlace', new PasskeyRequestError(404)));

      await expect(runLogin().unwrap()).rejects.toBe('unknown');
    });

    it('rejects with unknown for an error from outside the sign-in steps', async () => {
      mockWaitForSession.mockRejectedValueOnce(new Error('boom'));

      await expect(runLogin().unwrap()).rejects.toBe('unknown');
    });
  });
});
