/**
 * Tests for authenticateThunk — session restoration via SessionCreated.
 */

import { setAuthenticating, loginSuccess, loginFailed } from '@/store/slices/authSlice';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetActivePlace = jest.fn().mockResolvedValue({});

jest.mock('@arcus/core/services', () => ({
  SessionService: { SetActivePlace: (...args: any[]) => mockSetActivePlace(...args) },
}));

// Capture auth event listeners so we can fire them in tests
let authListeners: Record<string, ((...args: any[]) => void)[]> = {};
const mockAuthenticate = jest.fn();

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: {
    on(event: string, fn: (...args: any[]) => void) {
      (authListeners[event] ??= []).push(fn);
    },
    off(event: string, fn: (...args: any[]) => void) {
      authListeners[event] = (authListeners[event] ?? []).filter((l) => l !== fn);
    },
    authenticate: (...args: any[]) => mockAuthenticate(...args),
  },
}));

jest.mock('@arcus/core/config', () => ({ setConfig: jest.fn() }));
jest.mock('@arcus/core/bridge', () => ({ __esModule: true, default: { configure: jest.fn() } }));

// Track dispatched actions
const dispatched: any[] = [];
const dispatch = Object.assign(
  (action: any) => {
    dispatched.push(typeof action === 'function' ? action : { ...action });
    return action;
  },
  { getState: () => ({}), extra: undefined, requestId: 'test', signal: new AbortController().signal, abort: jest.fn(), condition: jest.fn() },
);

// ── Helpers ───────────────────────────────────────────────────────────

function emitAuth(event: string, data?: any) {
  for (const fn of [...(authListeners[event] ?? [])]) {
    fn(data);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────

// Import after mocks are registered
let authenticateThunk: typeof import('@/store/thunks/authenticateThunk').authenticateThunk;

beforeAll(async () => {
  authenticateThunk = (await import('@/store/thunks/authenticateThunk')).authenticateThunk;
});

beforeEach(() => {
  jest.clearAllMocks();
  authListeners = {};
  dispatched.length = 0;
  mockAuthenticate.mockResolvedValue(undefined);
});

describe('authenticateThunk', () => {
  const sessionPayload = {
    personId: 'person-1',
    places: [
      { placeId: 'place-1', placeName: 'Home', accountId: 'acc-1', role: 'OWNER' },
    ],
  };

  it('dispatches setAuthenticating(true) immediately', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(dispatched).toContainEqual(setAuthenticating(true));
  });

  it('dispatches loginSuccess on SessionCreated', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await authenticateThunk()(dispatch, () => ({}), undefined);

    const success = dispatched.find(
      (a) => a.type === loginSuccess.type,
    );
    expect(success).toBeDefined();
    expect(success.payload.person).toEqual(sessionPayload);
    expect(success.payload.account).toEqual({});
  });

  it('calls SetActivePlace with the default placeId', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(mockSetActivePlace).toHaveBeenCalledWith('place-1');
  });

  it('does not call SetActivePlace when places array is empty', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:success', { personId: 'person-1', places: [] });
      return Promise.resolve();
    });

    await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(mockSetActivePlace).not.toHaveBeenCalled();
  });

  it('dispatches loginFailed on authentication:fail', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:fail');
      return Promise.resolve();
    });

    await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(dispatched).toContainEqual(loginFailed());
  });

  it('dispatches loginFailed when authenticate() rejects', async () => {
    mockAuthenticate.mockRejectedValue(new Error('WebSocket error'));

    await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(dispatched).toContainEqual(loginFailed());
  });

  it('returns { session, placeId } on success', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    const result = await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(result.payload).toEqual({ session: sessionPayload, placeId: 'place-1' });
  });

  it('returns null on failure', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:fail');
      return Promise.resolve();
    });

    const result = await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(result.payload).toBeNull();
  });

  it('cleans up auth listeners after success', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(authListeners['authentication:success']).toHaveLength(0);
    expect(authListeners['authentication:fail']).toHaveLength(0);
  });

  it('cleans up auth listeners after failure', async () => {
    mockAuthenticate.mockImplementation(() => {
      emitAuth('authentication:fail');
      return Promise.resolve();
    });

    await authenticateThunk()(dispatch, () => ({}), undefined);

    expect(authListeners['authentication:success']).toHaveLength(0);
    expect(authListeners['authentication:fail']).toHaveLength(0);
  });
});
