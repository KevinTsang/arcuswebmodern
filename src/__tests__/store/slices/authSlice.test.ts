import reducer, {
  setAuthenticating,
  loginSuccess,
  accountUpdated,
  loginFailed,
  logout,
  sessionExpired,
  type AuthState,
} from '@/store/slices/authSlice';
import { personUpdated } from '@/store/slices/peopleSlice';
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

  it('accountUpdated replaces the account and keeps the rest of the session', () => {
    const person = { [Person.ATTR_FIRSTNAME]: 'Alice', [Base.ATTR_ADDRESS]: 'SERV:person:p1' };
    const logged = reducer(initial, loginSuccess({
      person,
      account: { [Account.ATTR_STATE]: 'ACTIVE', [Base.ATTR_ADDRESS]: 'SERV:account:a1' },
    }));
    const other = { [Account.ATTR_STATE]: 'ACTIVE', [Base.ATTR_ADDRESS]: 'SERV:account:a2' };
    const state = reducer(logged, accountUpdated(other));
    expect(state.account).toEqual(other);
    expect(state.person).toEqual(person);
    expect(state.authenticated).toBe(true);
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

  it('personUpdated merges changes into the signed-in person', () => {
    const logged = reducer(initial, loginSuccess({
      person: { [Base.ATTR_ADDRESS]: 'SERV:person:p1', [Person.ATTR_FIRSTNAME]: 'Alice', personId: 'p1' },
      account: { state: 'ACTIVE' },
    }));
    const state = reducer(logged, personUpdated({
      [Base.ATTR_ADDRESS]: 'SERV:person:p1',
      [Person.ATTR_FIRSTNAME]: 'Alicia',
    }));
    expect(state.person?.[Person.ATTR_FIRSTNAME]).toBe('Alicia');
    expect(state.person?.personId).toBe('p1');
  });

  it('personUpdated matches by personId when the person fetch failed', () => {
    // Only the SessionCreated payload: no base:address.
    const logged = reducer(initial, loginSuccess({
      person: { personId: 'p1', places: [] },
      account: { state: 'ACTIVE' },
    }));
    const state = reducer(logged, personUpdated({
      [Base.ATTR_ADDRESS]: 'SERV:person:p1',
      [Person.ATTR_FIRSTNAME]: 'Alicia',
    }));
    expect(state.person?.[Person.ATTR_FIRSTNAME]).toBe('Alicia');
  });

  it('personUpdated ignores changes to other people', () => {
    const logged = reducer(initial, loginSuccess({
      person: { [Base.ATTR_ADDRESS]: 'SERV:person:p1', [Person.ATTR_FIRSTNAME]: 'Alice' },
      account: { state: 'ACTIVE' },
    }));
    const state = reducer(logged, personUpdated({
      [Base.ATTR_ADDRESS]: 'SERV:person:p2',
      [Person.ATTR_FIRSTNAME]: 'Bob',
    }));
    expect(state.person?.[Person.ATTR_FIRSTNAME]).toBe('Alice');
  });
});
