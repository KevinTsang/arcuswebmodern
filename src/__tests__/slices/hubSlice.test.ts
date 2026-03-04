import reducer, { setHub, updateHub, clearHub } from '@/store/slices/hubSlice';

describe('hubSlice', () => {
  it('returns null hub initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.hub).toBeNull();
  });

  it('setHub stores the hub object', () => {
    const hub = { 'hub:state': 'NORMAL', 'hub:name': 'My Hub' };
    const state = reducer(undefined, setHub(hub));
    expect(state.hub).toEqual(hub);
  });

  it('updateHub merges attributes into existing hub', () => {
    let state = reducer(undefined, setHub({ 'hub:state': 'NORMAL', 'hub:name': 'My Hub' }));
    state = reducer(state, updateHub({ 'hub:state': 'DOWN' }));
    expect(state.hub?.['hub:state']).toBe('DOWN');
    expect(state.hub?.['hub:name']).toBe('My Hub');
  });

  it('updateHub does nothing when hub is null', () => {
    const state = reducer(undefined, updateHub({ 'hub:state': 'DOWN' }));
    expect(state.hub).toBeNull();
  });

  it('clearHub resets hub to null', () => {
    let state = reducer(undefined, setHub({ 'hub:state': 'NORMAL' }));
    state = reducer(state, clearHub());
    expect(state.hub).toBeNull();
  });
});
