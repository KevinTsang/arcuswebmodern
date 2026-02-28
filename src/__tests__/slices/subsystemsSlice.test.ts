import reducer, {
  subsystemAdded,
  subsystemUpdated,
  subsystemRemoved,
  subsystemsReceived,
  subsystemsClear,
} from '@/store/slices/subsystemsSlice';

function makeSub(address: string, extra: Record<string, unknown> = {}) {
  return { id: address, 'base:address': address, ...extra };
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
      'base:address': 'SERV:subsecurity:p1',
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
      { 'base:address': 'SERV:subalarm:p1' },
      { 'base:address': 'SERV:subclimate:p1' },
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
