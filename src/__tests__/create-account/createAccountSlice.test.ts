import { Person } from '@arcus/core';
import { initialState } from '@/components/create-account/types';
import {
  createAccountReducer,
  setField,
  setStep,
  setLoading,
  setError,
  clearError,
  accountCreated,
  setPinError,
} from '@/components/create-account/createAccountSlice';
import type { SessionCreatedEvent } from '@/arcus/types';

// ── Helpers ───────────────────────────────────────────────────────────

const person = { [Person.ATTR_FIRSTNAME]: 'Jane', personId: 'p-1', places: [] } as unknown as SessionCreatedEvent;

// ── Tests ─────────────────────────────────────────────────────────────

describe('createAccountSlice', () => {
  it('returns the initial state for an unknown action', () => {
    expect(createAccountReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    expect(initialState.step).toBe('credentials');
    expect(initialState.loading).toBe(false);
    expect(initialState.error).toBe('');
  });

  describe('setField', () => {
    it('updates string fields', () => {
      const next = createAccountReducer(initialState, setField({ field: 'email', value: 'a@b.com' }));
      expect(next.email).toBe('a@b.com');
    });

    it('updates the opt-in flag', () => {
      const next = createAccountReducer(initialState, setField({ field: 'optIn', value: true }));
      expect(next.optIn).toBe(true);
    });

    it('does not mutate the previous state', () => {
      const next = createAccountReducer(initialState, setField({ field: 'city', value: 'Springfield' }));
      expect(initialState.city).toBe('');
      expect(next).not.toBe(initialState);
    });
  });

  it('setStep changes the step', () => {
    expect(createAccountReducer(initialState, setStep('address')).step).toBe('address');
  });

  describe('setLoading', () => {
    it('toggles loading', () => {
      expect(createAccountReducer(initialState, setLoading(true)).loading).toBe(true);
      expect(createAccountReducer({ ...initialState, loading: true }, setLoading(false)).loading).toBe(false);
    });

    it('clears a stale PIN error when a request starts', () => {
      const prev = { ...initialState, pinError: 'bad pin' };
      expect(createAccountReducer(prev, setLoading(true)).pinError).toBeNull();
      expect(createAccountReducer(prev, setLoading(false)).pinError).toBe('bad pin');
    });
  });

  it('setError / clearError manage the form error', () => {
    const withError = createAccountReducer(initialState, setError('fail'));
    expect(withError.error).toBe('fail');
    expect(createAccountReducer(withError, clearError()).error).toBe('');
  });

  it('accountCreated stores the person and place and advances to the address step', () => {
    const next = createAccountReducer(initialState, accountCreated({ personData: person, placeId: 'p1' }));
    expect(next.personData).toEqual(person);
    expect(next.placeId).toBe('p1');
    expect(next.step).toBe('address');
  });

  it('setPinError sets and clears the PIN error', () => {
    const withError = createAccountReducer(initialState, setPinError('bad pin'));
    expect(withError.pinError).toBe('bad pin');
    expect(createAccountReducer(withError, setPinError(null)).pinError).toBeNull();
  });

  it('namespaces its action types', () => {
    expect(setStep('pin').type).toBe('createAccount/setStep');
    expect(clearError().type).toBe('createAccount/clearError');
  });
});
