/**
 * Tests for sessionFlow — the sign-in flow shared by loginThunk and
 * authenticateThunk: wait for SessionCreated, then scope the session to the
 * default place, load the account and person, and dispatch loginSuccess.
 */

import type { Dispatch } from '@reduxjs/toolkit';
import { Base, Account, Person } from '@arcus/core';
import type { SessionCreatedEvent, SessionPlace } from '@/arcus/types';
import type { AccountData, PersonData } from '@/store/entityTypes';
import { loginSuccess } from '@/store/slices/authSlice';
import { waitForSession, completeSession } from '@/store/utils/sessionFlow';

// ── Mocks ─────────────────────────────────────────────────────────────

type AuthEvent = 'authentication:success' | 'authentication:fail';
type AuthListener = (data?: SessionCreatedEvent) => void;

// Capture auth event listeners so tests can fire them and check they're removed
let authListeners: Partial<Record<AuthEvent, AuthListener[]>> = {};

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: {
    on(event: AuthEvent, fn: AuthListener) {
      (authListeners[event] ??= []).push(fn);
    },
    off(event: AuthEvent, fn: AuthListener) {
      authListeners[event] = (authListeners[event] ?? []).filter((l) => l !== fn);
    },
  },
}));

const mockSetActivePlace = jest.fn<Promise<void>, [string]>();

jest.mock('@arcus/core/services', () => ({
  SessionService: { SetActivePlace: (placeId: string) => mockSetActivePlace(placeId) },
}));

const mockBridgeRequest = jest.fn<Promise<PersonData | AccountData>, [string, string, object]>();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: {
    request: (command: string, address: string, attributes: object) =>
      mockBridgeRequest(command, address, attributes),
  },
}));

const mockDispatch = jest.fn();
const dispatch: Dispatch = (action) => {
  mockDispatch(action);
  return action;
};

// ── Helpers ───────────────────────────────────────────────────────────

const FAIL_MESSAGE = 'Authentication failed';
const PERSON_ID = 'person-1';
const PERSON_ADDRESS = `SERV:person:${PERSON_ID}`;
const ACCOUNT_ADDRESS = 'SERV:account:acc-1';

const PERSON: PersonData = {
  [Base.ATTR_ADDRESS]: PERSON_ADDRESS,
  [Person.ATTR_FIRSTNAME]: 'Alice',
  [Person.ATTR_EMAIL]: 'alice@test.com',
};

const ACCOUNT: AccountData = {
  [Base.ATTR_ADDRESS]: ACCOUNT_ADDRESS,
  [Account.ATTR_STATE]: 'ACTIVE',
  [Account.ATTR_OWNER]: PERSON_ID,
};

function makePlace(placeId: string, overrides: Partial<SessionPlace> = {}): SessionPlace {
  return { placeId, placeName: 'Home', accountId: 'acc-1', role: 'OWNER', ...overrides };
}

/**
 * A SessionCreated payload as the platform sends it: personId and places, but
 * none of the person's attributes. SessionCreatedEvent types it as already
 * merged with them, hence the cast.
 */
function makeSession(places: SessionPlace[] = [makePlace('place-1')]): SessionCreatedEvent {
  return { personId: PERSON_ID, places } as SessionCreatedEvent;
}

function emitAuth(event: AuthEvent, data?: SessionCreatedEvent) {
  for (const fn of [...(authListeners[event] ?? [])]) {
    fn(data);
  }
}

/** A start call that emits an auth event, as auth.login() and auth.authenticate() do. */
function startEmitting(event: AuthEvent, data?: SessionCreatedEvent) {
  return jest.fn(() => {
    emitAuth(event, data);
    return Promise.resolve();
  });
}

function expectNoAuthListeners() {
  expect(authListeners['authentication:success']).toHaveLength(0);
  expect(authListeners['authentication:fail']).toHaveLength(0);
}

/** Answer GetAttributes by address; pass an Error to make that request reject. */
function mockAttributes({ person = PERSON, account = ACCOUNT }: { person?: PersonData | Error; account?: AccountData | Error } = {}) {
  mockBridgeRequest.mockImplementation((_command, address) => {
    const result = address === PERSON_ADDRESS ? person : address === ACCOUNT_ADDRESS ? account : new Error(`Unexpected request to ${address}`);
    return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
  });
}

function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  jest.clearAllMocks();
  authListeners = {};
  localStorage.clear();
  mockSetActivePlace.mockResolvedValue(undefined);
  mockAttributes();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('waitForSession', () => {
  it('resolves with the SessionCreated payload emitted during the start call', async () => {
    const session = makeSession();
    const start = startEmitting('authentication:success', session);

    await expect(waitForSession(start, FAIL_MESSAGE)).resolves.toBe(session);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('removes its auth listeners after success', async () => {
    await waitForSession(startEmitting('authentication:success', makeSession()), FAIL_MESSAGE);

    expectNoAuthListeners();
  });

  it('rejects with the fail message on authentication:fail', async () => {
    await expect(waitForSession(startEmitting('authentication:fail'), FAIL_MESSAGE))
      .rejects.toThrow(new Error(FAIL_MESSAGE));
  });

  it('removes its auth listeners after authentication:fail', async () => {
    await waitForSession(startEmitting('authentication:fail'), FAIL_MESSAGE).catch(() => {});

    expectNoAuthListeners();
  });

  it('rejects with the reason the start call rejected with', async () => {
    const reason = new Error('Login failed: 401');

    await expect(waitForSession(() => Promise.reject(reason), FAIL_MESSAGE)).rejects.toBe(reason);
  });

  it('removes its auth listeners when the start call rejects', async () => {
    await waitForSession(() => Promise.reject(new Error('Login failed: 401')), FAIL_MESSAGE).catch(() => {});

    expectNoAuthListeners();
  });
});

describe('completeSession', () => {
  describe('default place', () => {
    it('sets the OWNER place active', async () => {
      const session = makeSession([
        makePlace('place-a', { placeName: 'Alpha', accountId: 'acc-2', role: 'GUEST' }),
        makePlace('place-b', { placeName: 'Beta' }),
      ]);

      await completeSession(session, dispatch);

      expect(mockSetActivePlace).toHaveBeenCalledWith('place-b');
    });

    it('falls back to the first place alphabetically when no place is OWNER', async () => {
      const session = makeSession([
        makePlace('place-b', { placeName: 'Beta', accountId: 'acc-2', role: 'GUEST' }),
        makePlace('place-a', { placeName: 'Alpha', role: 'GUEST' }),
      ]);

      await completeSession(session, dispatch);

      expect(mockSetActivePlace).toHaveBeenCalledWith('place-a');
    });

    it('prefers the place saved by the previous session', async () => {
      localStorage.setItem('arcus:placeId', 'place-a');
      const session = makeSession([
        makePlace('place-a', { placeName: 'Alpha', role: 'GUEST' }),
        makePlace('place-b', { placeName: 'Beta', accountId: 'acc-2' }),
      ]);

      await completeSession(session, dispatch);

      expect(mockSetActivePlace).toHaveBeenCalledWith('place-a');
    });

    it('saves the selected place for session restore', async () => {
      await completeSession(makeSession(), dispatch);

      expect(localStorage.getItem('arcus:placeId')).toBe('place-1');
    });

    it('returns the selected placeId', async () => {
      await expect(completeSession(makeSession(), dispatch)).resolves.toBe('place-1');
    });
  });

  describe('without places', () => {
    it('rejects without setting or saving a place, loading data or signing in', async () => {
      await expect(completeSession(makeSession([]), dispatch))
        .rejects.toThrow('No account found for the selected place');

      expect(mockSetActivePlace).not.toHaveBeenCalled();
      expect(localStorage.getItem('arcus:placeId')).toBeNull();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('account and person', () => {
    it('does not request anything until SetActivePlace resolves', async () => {
      let resolveActivePlace: () => void = () => {};
      mockSetActivePlace.mockReturnValueOnce(new Promise<void>((resolve) => {
        resolveActivePlace = () => resolve();
      }));

      const done = completeSession(makeSession(), dispatch);
      await flushPromises();
      expect(mockBridgeRequest).not.toHaveBeenCalled();

      resolveActivePlace();
      await done;
      expect(mockBridgeRequest.mock.calls.map(([, address]) => address)).toEqual([PERSON_ADDRESS, ACCOUNT_ADDRESS]);
    });

    it('fetches the account for the selected place', async () => {
      await completeSession(makeSession(), dispatch);

      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, ACCOUNT_ADDRESS, {});
    });

    it('fetches the person', async () => {
      await completeSession(makeSession(), dispatch);

      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, PERSON_ADDRESS, {});
    });

    it('dispatches loginSuccess with the person merged into the session and the account', async () => {
      const session = makeSession();

      await completeSession(session, dispatch);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(loginSuccess({ person: { ...session, ...PERSON }, account: ACCOUNT }));
    });

    it('falls back to the session payload when the person fetch fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const failure = new Error('fail');
      mockAttributes({ person: failure });
      const session = makeSession();

      await expect(completeSession(session, dispatch)).resolves.toBe('place-1');

      expect(mockDispatch).toHaveBeenCalledWith(loginSuccess({ person: session, account: ACCOUNT }));
      expect(consoleError).toHaveBeenCalledWith('Failed to load person attributes:', failure);
      consoleError.mockRestore();
    });

    it('rejects without signing in when the account fetch fails', async () => {
      const failure = new Error('fail');
      mockAttributes({ account: failure });

      await expect(completeSession(makeSession(), dispatch)).rejects.toBe(failure);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
