import { Person } from '@arcus/core';
import { createAccountReducer, initialState } from '@/components/create-account/types';

describe('createAccountReducer', () => {
  it('returns initial state', () => {
    expect(initialState.step).toBe('credentials');
    expect(initialState.loading).toBe(false);
    expect(initialState.error).toBe('');
  });

  it('SET_FIELD updates string fields', () => {
    const next = createAccountReducer(initialState, { type: 'SET_FIELD', field: 'email', value: 'a@b.com' });
    expect(next.email).toBe('a@b.com');
  });

  it('SET_FIELD updates boolean fields', () => {
    const next = createAccountReducer(initialState, { type: 'SET_FIELD', field: 'optIn', value: true });
    expect(next.optIn).toBe(true);
  });

  it('SET_STEP changes step', () => {
    const next = createAccountReducer(initialState, { type: 'SET_STEP', step: 'address' });
    expect(next.step).toBe('address');
  });

  it('SET_LOADING toggles loading', () => {
    const next = createAccountReducer(initialState, { type: 'SET_LOADING', loading: true });
    expect(next.loading).toBe(true);
  });

  it('SET_ERROR sets error', () => {
    const next = createAccountReducer(initialState, { type: 'SET_ERROR', error: 'fail' });
    expect(next.error).toBe('fail');
  });

  it('CLEAR_ERROR clears error', () => {
    const s = { ...initialState, error: 'fail' };
    const next = createAccountReducer(s, { type: 'CLEAR_ERROR' });
    expect(next.error).toBe('');
  });

  it('ACCOUNT_CREATED sets personData, placeId, and advances to address', () => {
    const person = { [Person.ATTR_FIRSTNAME]: 'Jane' };
    const next = createAccountReducer(initialState, { type: 'ACCOUNT_CREATED', personData: person, placeId: 'p1' });
    expect(next.personData).toBe(person);
    expect(next.placeId).toBe('p1');
    expect(next.step).toBe('address');
  });

  it('SET_PIN_ERROR sets pinError', () => {
    const next = createAccountReducer(initialState, { type: 'SET_PIN_ERROR', pinError: 'bad pin' });
    expect(next.pinError).toBe('bad pin');
  });

  it('returns state for unknown action', () => {
    const next = createAccountReducer(initialState, { type: 'UNKNOWN' } as any);
    expect(next).toBe(initialState);
  });
});
