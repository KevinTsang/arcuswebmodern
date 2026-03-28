import reducer, {
  schedulerAdded,
  schedulerUpdated,
  schedulerRemoved,
  schedulersReceived,
  schedulersClear,
} from '@/store/slices/schedulersSlice';

function makeScheduler(address: string, extra: Record<string, unknown> = {}) {
  return { id: address, 'base:address': address, ...extra };
}

describe('schedulersSlice', () => {
  it('returns empty initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
  });

  it('schedulerAdded adds one scheduler', () => {
    const state = reducer(
      undefined,
      schedulerAdded(makeScheduler('SERV:sched:s1', { 'sched:group': 'lights' })),
    );
    expect(state.ids).toEqual(['SERV:sched:s1']);
    expect(state.entities['SERV:sched:s1']?.['sched:group']).toBe('lights');
  });

  it('schedulerUpdated updates an existing scheduler', () => {
    let state = reducer(undefined, schedulerAdded(makeScheduler('SERV:sched:s1', { 'sched:group': 'old' })));
    state = reducer(state, schedulerUpdated({ 'base:address': 'SERV:sched:s1', 'sched:group': 'new' }));
    expect(state.entities['SERV:sched:s1']?.['sched:group']).toBe('new');
  });

  it('schedulerRemoved removes a scheduler', () => {
    let state = reducer(undefined, schedulerAdded(makeScheduler('SERV:sched:s1')));
    state = reducer(state, schedulerAdded(makeScheduler('SERV:sched:s2')));
    state = reducer(state, schedulerRemoved('SERV:sched:s1'));
    expect(state.ids).toEqual(['SERV:sched:s2']);
  });

  it('schedulersReceived replaces all schedulers', () => {
    let state = reducer(undefined, schedulerAdded(makeScheduler('SERV:sched:old')));
    state = reducer(
      state,
      schedulersReceived([
        { 'base:address': 'SERV:sched:a' },
        { 'base:address': 'SERV:sched:b' },
      ]),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['SERV:sched:old']).toBeUndefined();
  });

  it('schedulersClear empties the store', () => {
    let state = reducer(undefined, schedulerAdded(makeScheduler('SERV:sched:s1')));
    state = reducer(state, schedulersClear());
    expect(state.ids).toEqual([]);
  });
});
