/**
 * Tests for authenticateThunk — session restore from the auth cookie. The
 * shared sign-in flow (waitForSession, completeSession) is mocked here; it has
 * its own tests in src/__tests__/store/utils/sessionFlow.test.ts.
 */

import type { SessionCreatedEvent } from '@/arcus/types';
import { setAuthenticating, loginFailed } from '@/store/slices/authSlice';
import { initializeCoreConfig } from '@/store/thunks/initConfig';
import { authenticateThunk } from '@/store/thunks/authenticateThunk';
import { waitForSession, completeSession } from '@/store/utils/sessionFlow';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockAuthenticate = jest.fn<Promise<void>, []>();

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: {
    authenticate: () => mockAuthenticate(),
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

// Passed through untouched, since completeSession is mocked.
const session = { personId: 'person-1', places: [] } as SessionCreatedEvent;

function runRestore() {
  return authenticateThunk()(mockDispatch, () => ({}), undefined);
}

/** The start call the thunk handed to waitForSession. */
function startCall() {
  expect(mockWaitForSession).toHaveBeenCalledTimes(1);
  return mockWaitForSession.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticate.mockResolvedValue(undefined);
  mockWaitForSession.mockResolvedValue(session);
  mockCompleteSession.mockResolvedValue('place-1');
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('authenticateThunk', () => {
  describe('on success', () => {
    it('initializes the core config', async () => {
      await runRestore();

      expect(mockInitializeCoreConfig).toHaveBeenCalledTimes(1);
    });

    it('dispatches setAuthenticating(true)', async () => {
      await runRestore();

      expect(mockDispatch).toHaveBeenCalledWith(setAuthenticating(true));
    });

    it('waits for a session with the restore fail message', async () => {
      await runRestore();

      expect(mockWaitForSession).toHaveBeenCalledWith(expect.any(Function), 'No valid session');
    });

    it('restores the session with auth.authenticate only through the start call', async () => {
      await runRestore();
      expect(mockAuthenticate).not.toHaveBeenCalled();

      await startCall()();

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    });

    it('completes the session with the SessionCreated payload and dispatch', async () => {
      await runRestore();

      expect(mockCompleteSession).toHaveBeenCalledWith(session, mockDispatch);
    });

    it('returns { session, placeId }', async () => {
      const result = await runRestore();

      expect(result.payload).toEqual({ session, placeId: 'place-1' });
    });

    it('does not dispatch loginFailed', async () => {
      await runRestore();

      expect(mockDispatch).not.toHaveBeenCalledWith(loginFailed());
    });
  });

  describe('on failure', () => {
    it('dispatches loginFailed and returns null when no session is established', async () => {
      mockWaitForSession.mockRejectedValue(new Error('No valid session'));

      const result = await runRestore();

      expect(result.payload).toBeNull();
      expect(mockDispatch).toHaveBeenCalledWith(loginFailed());
      expect(mockCompleteSession).not.toHaveBeenCalled();
    });

    it('dispatches loginFailed and returns null when completing the session fails', async () => {
      mockCompleteSession.mockRejectedValue(new Error('No account found for the selected place'));

      const result = await runRestore();

      expect(result.payload).toBeNull();
      expect(mockDispatch).toHaveBeenCalledWith(loginFailed());
    });
  });
});
