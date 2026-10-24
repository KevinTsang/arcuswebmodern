/**
 * Tests for loginThunk — credential login via SessionCreated.
 */

import { setAuthenticating, loginSuccess, loginFailed } from '@/store/slices/authSlice';
import { Base, Account, Person } from '@arcus/core';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetActivePlace = jest.fn().mockResolvedValue({});

jest.mock('@arcus/core/services', () => ({
  SessionService: { SetActivePlace: (...args: any[]) => mockSetActivePlace(...args) },
}));

let authListeners: Record<string, ((...args: any[]) => void)[]> = {};
const mockLogin = jest.fn();

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: {
    on(event: string, fn: (...args: any[]) => void) {
      (authListeners[event] ??= []).push(fn);
    },
    off(event: string, fn: (...args: any[]) => void) {
      authListeners[event] = (authListeners[event] ?? []).filter((l) => l !== fn);
    },
    login: (...args: any[]) => mockLogin(...args),
  },
}));

jest.mock('@arcus/core/config', () => ({ setConfig: jest.fn() }));
const mockBridgeRequest = jest.fn().mockResolvedValue({});
jest.mock('@arcus/core/bridge', () => ({ __esModule: true, default: { configure: jest.fn(), request: (...args: any[]) => mockBridgeRequest(...args) } }));

const dispatched: any[] = [];
const dispatch = Object.assign(
  (action: any) => {
    dispatched.push(typeof action === 'function' ? action : { ...action });
    return action;
  },
  { getState: () => ({}), extra: undefined, requestId: 'test', signal: new AbortController().signal, abort: jest.fn(), condition: jest.fn() },
);

function emitAuth(event: string, data?: any) {
  for (const fn of [...(authListeners[event] ?? [])]) {
    fn(data);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────

let loginThunk: typeof import('@/store/thunks/loginThunk').loginThunk;

beforeAll(async () => {
  loginThunk = (await import('@/store/thunks/loginThunk')).loginThunk;
});

beforeEach(() => {
  jest.clearAllMocks();
  authListeners = {};
  dispatched.length = 0;
  mockBridgeRequest.mockResolvedValue({});
  mockLogin.mockResolvedValue(undefined);
  localStorage.clear();
});

describe('loginThunk', () => {
  const creds = { username: 'user@test.com', password: 'secret', isPublic: false };
  const sessionPayload = {
    personId: 'person-1',
    places: [
      { placeId: 'place-1', placeName: 'Home', accountId: 'acc-1', role: 'OWNER' },
    ],
  };

  it('dispatches setAuthenticating(true)', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    expect(dispatched).toContainEqual(setAuthenticating(true));
  });

  it('calls auth.login with credentials', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'secret', false);
  });

  it('dispatches loginSuccess on SessionCreated', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    const success = dispatched.find((a) => a.type === loginSuccess.type);
    expect(success).toBeDefined();
    expect(success.payload.person).toEqual(sessionPayload);
  });

  it('calls SetActivePlace with OWNER place', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    expect(mockSetActivePlace).toHaveBeenCalledWith('place-1');
  });

  it('stores placeId in localStorage', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    expect(localStorage.getItem('arcus:placeId')).toBe('place-1');
  });

  it('does not call SetActivePlace when places is empty', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', { personId: 'p1', places: [] });
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    expect(mockSetActivePlace).not.toHaveBeenCalled();
  });

  it('does not store placeId when places is empty', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', { personId: 'p1', places: [] });
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    expect(localStorage.getItem('arcus:placeId')).toBeNull();
  });

  it('dispatches loginFailed on authentication:fail', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:fail');
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined).catch(() => {});

    expect(dispatched).toContainEqual(loginFailed());
  });

  it('dispatches loginFailed when login() rejects', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));

    await loginThunk(creds)(dispatch, () => ({}), undefined).catch(() => {});

    expect(dispatched).toContainEqual(loginFailed());
  });

  it('passes isPublic flag to auth.login', async () => {
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk({ ...creds, isPublic: true })(dispatch, () => ({}), undefined);

    expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'secret', true);
  });

  it('fetches account for the selected place', async () => {
    const accountData = { [Base.ATTR_ADDRESS]: 'SERV:account:acc-1', [Account.ATTR_STATE]: 'ACTIVE' };
    mockBridgeRequest.mockResolvedValueOnce(accountData);
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    expect(mockBridgeRequest).toHaveBeenCalledWith(
      Base.CMD_GETATTRIBUTES,
      'SERV:account:acc-1',
      {},
    );
    const success = dispatched.find((a) => a.type === loginSuccess.type);
    expect(success.payload.account).toEqual(accountData);
  });

  it('fetches the person and merges their attributes into the session', async () => {
    const personData = {
      [Base.ATTR_ADDRESS]: 'SERV:person:person-1',
      [Person.ATTR_FIRSTNAME]: 'Alice',
      [Person.ATTR_EMAIL]: 'alice@test.com',
    };
    mockBridgeRequest.mockImplementation((_cmd: string, address: string) =>
      Promise.resolve(address.startsWith('SERV:person:') ? personData : {}),
    );
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    expect(mockBridgeRequest).toHaveBeenCalledWith(
      Base.CMD_GETATTRIBUTES,
      'SERV:person:person-1',
      {},
    );
    const success = dispatched.find((a) => a.type === loginSuccess.type);
    expect(success.payload.person).toEqual({ ...sessionPayload, ...personData });
  });

  it('dispatches loginFailed when account fetch fails', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', sessionPayload);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined).catch(() => {});

    expect(dispatched).toContainEqual(loginFailed());
  });

  it('picks non-OWNER place when no OWNER exists', async () => {
    const guestSession = {
      personId: 'person-1',
      places: [
        { placeId: 'place-b', placeName: 'Beta', accountId: 'acc-2', role: 'GUEST' },
        { placeId: 'place-a', placeName: 'Alpha', accountId: 'acc-1', role: 'GUEST' },
      ],
    };
    mockLogin.mockImplementation(() => {
      emitAuth('authentication:success', guestSession);
      return Promise.resolve();
    });

    await loginThunk(creds)(dispatch, () => ({}), undefined);

    // Falls back to first alphabetically
    expect(mockSetActivePlace).toHaveBeenCalledWith('place-a');
  });
});
