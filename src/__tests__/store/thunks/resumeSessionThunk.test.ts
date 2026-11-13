/**
 * Tests for resumeSessionThunk — adopting the browser's current session cookie
 * after the platform ends this socket's session. The shared sign-in flow
 * (waitForSession, completeSession) is mocked here; it has its own tests in
 * src/__tests__/store/utils/sessionFlow.test.ts.
 */

import type { SessionCreatedEvent } from '@/arcus/types';
import { sessionExpired } from '@/store/slices/authSlice';
import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';
import { resumeSessionThunk, RESUME_COOLDOWN_MS } from '@/store/thunks/resumeSessionThunk';
import { waitForSession, completeSession, SessionStepError } from '@/store/utils/sessionFlow';
import type { RootState } from '@/store/store';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockAuthenticate = jest.fn<Promise<void>, []>();
const mockReset = jest.fn();

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: {
    authenticate: () => mockAuthenticate(),
    reset: () => mockReset(),
  },
}));

jest.mock('@/store/utils/sessionFlow', () => ({
  waitForSession: jest.fn(),
  completeSession: jest.fn(),
  SessionStepError: class SessionStepError extends Error {
    constructor(readonly step: string, readonly reason: Error | object) {
      super(`Sign-in step "${step}" failed`);
    }
  },
}));

const PLACE_LOAD_ACTION = { type: 'place/loadData/test' };

jest.mock('@/store/thunks/loadPlaceDataThunk', () => ({
  loadPlaceDataThunk: jest.fn(() => PLACE_LOAD_ACTION),
}));

const mockWaitForSession = jest.mocked(waitForSession);
const mockCompleteSession = jest.mocked(completeSession);
const mockLoadPlaceData = jest.mocked(loadPlaceDataThunk);
const mockDispatch = jest.fn();

// ── Helpers ───────────────────────────────────────────────────────────

const session = { personId: 'person-1', places: [] } as SessionCreatedEvent;

function runResume() {
  return resumeSessionThunk()(mockDispatch, () => ({}) as RootState, undefined);
}

/** The start call the thunk handed to waitForSession. */
function startCall() {
  expect(mockWaitForSession).toHaveBeenCalledTimes(1);
  return mockWaitForSession.mock.calls[0][0];
}

// The thunk remembers when it last resumed across calls, so every test starts
// well past the previous test's cooldown.
let clock = Date.parse('2026-01-01T00:00:00Z');

let consoleWarn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  clock += RESUME_COOLDOWN_MS * 10;
  jest.setSystemTime(clock);
  mockAuthenticate.mockResolvedValue(undefined);
  mockWaitForSession.mockResolvedValue(session);
  mockCompleteSession.mockResolvedValue('place-1');
  consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  consoleWarn.mockRestore();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('resumeSessionThunk', () => {
  describe('when the browser holds a valid session cookie', () => {
    it('drops the ended socket, then reconnects with the cookie', async () => {
      await runResume();

      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockReset.mock.invocationCallOrder[0])
        .toBeLessThan(mockWaitForSession.mock.invocationCallOrder[0]);

      // The start call opens the socket without POSTing credentials
      await startCall()();
      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    });

    it('finishes signing in with the new session', async () => {
      await runResume();

      expect(mockCompleteSession).toHaveBeenCalledWith(session, mockDispatch);
    });

    it('reloads the place the new session is scoped to', async () => {
      await runResume();

      expect(mockLoadPlaceData).toHaveBeenCalledWith('place-1');
      expect(mockDispatch).toHaveBeenCalledWith(PLACE_LOAD_ACTION);
    });

    it('does not reload a place when the session has none', async () => {
      mockCompleteSession.mockResolvedValueOnce(undefined);

      await runResume();

      expect(mockLoadPlaceData).not.toHaveBeenCalled();
    });

    it('resolves true and does not expire the session', async () => {
      const result = await runResume();

      expect(result.payload).toBe(true);
      expect(mockDispatch).not.toHaveBeenCalledWith(sessionExpired());
    });
  });

  describe('when the session cannot be resumed', () => {
    it('expires the session when the platform rejects the cookie', async () => {
      mockWaitForSession.mockRejectedValueOnce(
        new SessionStepError('SessionCreated', new Error('No replacement session')),
      );

      const result = await runResume();

      expect(result.payload).toBe(false);
      expect(mockDispatch).toHaveBeenCalledWith(sessionExpired());
      expect(mockCompleteSession).not.toHaveBeenCalled();
    });

    it('expires the session when finishing sign-in fails', async () => {
      mockCompleteSession.mockRejectedValueOnce(new Error('account failed'));

      await runResume();

      expect(mockDispatch).toHaveBeenCalledWith(sessionExpired());
      expect(mockLoadPlaceData).not.toHaveBeenCalled();
    });

    it('drops the failed socket so nothing reconnects behind the login form', async () => {
      mockWaitForSession.mockRejectedValueOnce(new Error('fail'));

      await runResume();

      expect(mockReset).toHaveBeenCalledTimes(2);
    });

    it('logs why resuming failed', async () => {
      const error = new Error('fail');
      mockWaitForSession.mockRejectedValueOnce(error);

      await runResume();

      expect(consoleWarn).toHaveBeenCalledWith('Could not resume the platform session:', error);
    });
  });

  describe('cooldown', () => {
    it('expires the session without reconnecting when it ends again within the cooldown', async () => {
      await runResume();
      jest.clearAllMocks();
      jest.setSystemTime(clock + RESUME_COOLDOWN_MS - 1);

      const result = await runResume();

      expect(result.payload).toBe(false);
      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockWaitForSession).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(sessionExpired());
    });

    it('resumes again once the cooldown has passed', async () => {
      await runResume();
      jest.clearAllMocks();
      jest.setSystemTime(clock + RESUME_COOLDOWN_MS);

      const result = await runResume();

      expect(result.payload).toBe(true);
      expect(mockWaitForSession).toHaveBeenCalledTimes(1);
    });

    it('counts a failed attempt toward the cooldown', async () => {
      mockWaitForSession.mockRejectedValueOnce(new Error('fail'));
      await runResume();
      jest.clearAllMocks();
      jest.setSystemTime(clock + 1000);

      await runResume();

      expect(mockWaitForSession).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(sessionExpired());
    });
  });
});
