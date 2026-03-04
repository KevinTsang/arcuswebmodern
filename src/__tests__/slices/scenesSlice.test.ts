import reducer, {
  sceneAdded,
  sceneUpdated,
  sceneRemoved,
  scenesReceived,
  scenesClear,
} from '@/store/slices/scenesSlice';

function makeScene(address: string, extra: Record<string, unknown> = {}) {
  return { id: address, 'base:address': address, ...extra };
}

describe('scenesSlice', () => {
  it('returns empty initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
  });

  it('sceneAdded adds one scene', () => {
    const state = reducer(undefined, sceneAdded(makeScene('SERV:scene:s1', { 'scene:name': 'Good Night' })));
    expect(state.ids).toEqual(['SERV:scene:s1']);
    expect(state.entities['SERV:scene:s1']?.['scene:name']).toBe('Good Night');
  });

  it('sceneUpdated updates an existing scene', () => {
    let state = reducer(undefined, sceneAdded(makeScene('SERV:scene:s1', { 'scene:name': 'Old' })));
    state = reducer(state, sceneUpdated({ 'base:address': 'SERV:scene:s1', 'scene:name': 'New' }));
    expect(state.entities['SERV:scene:s1']?.['scene:name']).toBe('New');
  });

  it('sceneRemoved removes a scene', () => {
    let state = reducer(undefined, sceneAdded(makeScene('SERV:scene:s1')));
    state = reducer(state, sceneAdded(makeScene('SERV:scene:s2')));
    state = reducer(state, sceneRemoved('SERV:scene:s1'));
    expect(state.ids).toEqual(['SERV:scene:s2']);
  });

  it('scenesReceived replaces all scenes', () => {
    let state = reducer(undefined, sceneAdded(makeScene('SERV:scene:old')));
    state = reducer(
      state,
      scenesReceived([
        { 'base:address': 'SERV:scene:a', 'scene:name': 'A' },
        { 'base:address': 'SERV:scene:b', 'scene:name': 'B' },
      ]),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['SERV:scene:old']).toBeUndefined();
    expect(state.entities['SERV:scene:a']?.['scene:name']).toBe('A');
  });

  it('scenesClear empties the store', () => {
    let state = reducer(undefined, sceneAdded(makeScene('SERV:scene:s1')));
    state = reducer(state, scenesClear());
    expect(state.ids).toEqual([]);
  });
});
