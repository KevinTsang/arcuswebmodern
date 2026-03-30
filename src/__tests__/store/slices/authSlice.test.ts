import reducer, {
  setAuthenticating,
  loginSuccess,
  loginFailed,
  logout,
  sessionExpired,
  type AuthState,
} from '@/store/slices/authSlice';
import { Base, Person, Account } from '@arcus/core';

const initial: AuthState = {
  authenticating: false,
  authenticated: false,
  sessionExpired: false,
  person: null,
  account: null,
};

describe('authSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('setAuthenticating sets the flag', () => {
    const state = reducer(initial, setAuthenticating(true));
    expect(state.authenticating).toBe(true);
    expect(state.authenticated).toBe(false);
  });

  it('loginSuccess sets person, account, and authenticated', () => {
    const person = { [Person.ATTR_FIRSTNAME]: 'Alice', [Base.ATTR_ADDRESS]: 'SERV:person:p1' };
    const account = { [Account.ATTR_STATE]: 'ACTIVE', [Base.ATTR_ADDRESS]: 'SERV:account:a1' };
    const state = reducer(
      { ...initial, authenticating: true },
      loginSuccess({ person, account }),
    );
    expect(state.authenticated).toBe(true);
    expect(state.authenticating).toBe(false);
    expect(state.person).toEqual(person);
    expect(state.account).toEqual(account);
  });

  it('loginFailed clears everything', () => {
    const logged = reducer(initial, loginSuccess({
      person: { name: 'Test' },
      account: { state: 'ACTIVE' },
    }));
    const state = reducer(logged, loginFailed());
    expect(state.authenticated).toBe(false);
    expect(state.authenticating).toBe(false);
    expect(state.person).toBeNull();
    expect(state.account).toBeNull();
  });

  it('logout clears state', () => {
    const logged = reducer(initial, loginSuccess({
      person: { name: 'Test' },
      account: { state: 'ACTIVE' },
    }));
    const state = reducer(logged, logout());
    expect(state).toEqual(initial);
  });

  it('sessionExpired clears auth and sets sessionExpired flag', () => {
    const logged = reducer(initial, loginSuccess({
      person: { name: 'Test' },
      account: { state: 'ACTIVE' },
    }));
    const state = reducer(logged, sessionExpired());
    expect(state.authenticated).toBe(false);
    expect(state.sessionExpired).toBe(true);
    expect(state.person).toBeNull();
    expect(state.account).toBeNull();
  });

  it('loginSuccess clears sessionExpired flag', () => {
    const expired = reducer(initial, sessionExpired());
    expect(expired.sessionExpired).toBe(true);
    const state = reducer(expired, loginSuccess({
      person: { name: 'Test' },
      account: { state: 'ACTIVE' },
    }));
    expect(state.sessionExpired).toBe(false);
    expect(state.authenticated).toBe(true);
  });
});
