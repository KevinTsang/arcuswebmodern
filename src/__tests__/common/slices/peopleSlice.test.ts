import reducer, {
  personAdded,
  personUpdated,
  personRemoved,
  peopleReceived,
  peopleClear,
} from '@/store/slices/peopleSlice';

function makePerson(address: string, extra: Record<string, unknown> = {}) {
  return { id: address, 'base:address': address, ...extra };
}

describe('peopleSlice', () => {
  it('returns empty initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
  });

  it('personAdded adds one person', () => {
    const state = reducer(undefined, personAdded(makePerson('SERV:person:p1', { 'person:firstName': 'Alice' })));
    expect(state.ids).toEqual(['SERV:person:p1']);
    expect(state.entities['SERV:person:p1']?.['person:firstName']).toBe('Alice');
  });

  it('personUpdated updates an existing person', () => {
    let state = reducer(undefined, personAdded(makePerson('SERV:person:p1', { 'person:firstName': 'Alice' })));
    state = reducer(state, personUpdated({ 'base:address': 'SERV:person:p1', 'person:firstName': 'Bob' }));
    expect(state.entities['SERV:person:p1']?.['person:firstName']).toBe('Bob');
  });

  it('personRemoved removes a person', () => {
    let state = reducer(undefined, personAdded(makePerson('SERV:person:p1')));
    state = reducer(state, personAdded(makePerson('SERV:person:p2')));
    state = reducer(state, personRemoved('SERV:person:p1'));
    expect(state.ids).toEqual(['SERV:person:p2']);
  });

  it('peopleReceived replaces all people', () => {
    let state = reducer(undefined, personAdded(makePerson('SERV:person:old')));
    state = reducer(
      state,
      peopleReceived([
        { 'base:address': 'SERV:person:a', 'person:firstName': 'A' },
        { 'base:address': 'SERV:person:b', 'person:firstName': 'B' },
      ]),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['SERV:person:old']).toBeUndefined();
  });

  it('peopleClear empties the store', () => {
    let state = reducer(undefined, personAdded(makePerson('SERV:person:p1')));
    state = reducer(state, peopleClear());
    expect(state.ids).toEqual([]);
  });
});
