import reducer, {
  personAdded,
  personUpdated,
  personRemoved,
  peopleReceived,
  peopleClear,
} from '@/store/slices/peopleSlice';
import type { PersonEntity } from '@/store/entityTypes';
import { Base, Person } from '@arcus/core';

function makePerson(address: string, extra: Partial<PersonEntity> = {}) {
  return { id: address, [Base.ATTR_ADDRESS]: address, ...extra };
}

describe('peopleSlice', () => {
  it('returns empty initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
  });

  it('personAdded adds one person', () => {
    const state = reducer(undefined, personAdded(makePerson('SERV:person:p1', { [Person.ATTR_FIRSTNAME]: 'Alice' })));
    expect(state.ids).toEqual(['SERV:person:p1']);
    expect(state.entities['SERV:person:p1']?.[Person.ATTR_FIRSTNAME]).toBe('Alice');
  });

  it('personUpdated updates an existing person', () => {
    let state = reducer(undefined, personAdded(makePerson('SERV:person:p1', { [Person.ATTR_FIRSTNAME]: 'Alice' })));
    state = reducer(state, personUpdated({ [Base.ATTR_ADDRESS]: 'SERV:person:p1', [Person.ATTR_FIRSTNAME]: 'Bob' }));
    expect(state.entities['SERV:person:p1']?.[Person.ATTR_FIRSTNAME]).toBe('Bob');
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
        { [Base.ATTR_ADDRESS]: 'SERV:person:a', [Person.ATTR_FIRSTNAME]: 'A' },
        { [Base.ATTR_ADDRESS]: 'SERV:person:b', [Person.ATTR_FIRSTNAME]: 'B' },
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
