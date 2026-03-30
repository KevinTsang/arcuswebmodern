import reducer, {
  subsystemAdded,
  subsystemUpdated,
  subsystemRemoved,
  subsystemsReceived,
  subsystemsClear,
} from '@/store/slices/subsystemsSlice';
import type { SubsystemEntity } from '@/store/entityTypes';
import { Base } from '@arcus/core';

function makeSub(address: string, extra: Partial<SubsystemEntity> = {}) {
  return { id: address, [Base.ATTR_ADDRESS]: address, ...extra };
}

describe('subsystemsSlice', () => {
  it('returns empty initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
  });

  it('subsystemAdded adds a subsystem', () => {
    const state = reducer(
      undefined,
      subsystemAdded(makeSub('SERV:subalarm:place1', { 'subalarm:alarmState': 'READY' })),
    );
    expect(state.ids).toEqual(['SERV:subalarm:place1']);
    expect(state.entities['SERV:subalarm:place1']?.['subalarm:alarmState']).toBe('READY');
  });

  it('subsystemUpdated merges changes', () => {
    let state = reducer(
      undefined,
      subsystemAdded(makeSub('SERV:subsecurity:p1', { 'subsecurity:alarmMode': 'OFF' })),
    );
    state = reducer(state, subsystemUpdated({
      [Base.ATTR_ADDRESS]: 'SERV:subsecurity:p1',
      'subsecurity:alarmMode': 'ON',
    }));
    expect(state.entities['SERV:subsecurity:p1']?.['subsecurity:alarmMode']).toBe('ON');
  });

  it('subsystemRemoved deletes by id', () => {
    let state = reducer(undefined, subsystemAdded(makeSub('SERV:subalarm:p1')));
    state = reducer(state, subsystemRemoved('SERV:subalarm:p1'));
    expect(state.ids).toEqual([]);
  });

  it('subsystemsReceived replaces all', () => {
    let state = reducer(undefined, subsystemAdded(makeSub('SERV:old:p1')));
    state = reducer(state, subsystemsReceived([
      { [Base.ATTR_ADDRESS]: 'SERV:subalarm:p1' },
      { [Base.ATTR_ADDRESS]: 'SERV:subclimate:p1' },
    ]));
    expect(state.ids).toHaveLength(2);
    expect(state.entities['SERV:old:p1']).toBeUndefined();
  });

  it('subsystemsClear empties the store', () => {
    let state = reducer(undefined, subsystemAdded(makeSub('SERV:subalarm:p1')));
    state = reducer(state, subsystemsClear());
    expect(state.ids).toEqual([]);
  });
});
