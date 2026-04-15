import reducer, {
  sceneAdded,
  sceneUpdated,
  sceneRemoved,
  scenesReceived,
  scenesClear,
} from '@/store/slices/scenesSlice';
import { Base, Scene } from '@arcus/core';
import { makeScene } from '../../helpers/factories';

describe('scenesSlice', () => {
  it('returns empty initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
  });

  it('sceneAdded adds one scene', () => {
    const state = reducer(undefined, sceneAdded(makeScene('SERV:scene:s1', { [Scene.ATTR_NAME]: 'Good Night' })));
    expect(state.ids).toEqual(['SERV:scene:s1']);
    expect(state.entities['SERV:scene:s1']?.[Scene.ATTR_NAME]).toBe('Good Night');
  });

  it('sceneUpdated updates an existing scene', () => {
    let state = reducer(undefined, sceneAdded(makeScene('SERV:scene:s1', { [Scene.ATTR_NAME]: 'Old' })));
    state = reducer(state, sceneUpdated({ [Base.ATTR_ADDRESS]: 'SERV:scene:s1', [Scene.ATTR_NAME]: 'New' }));
    expect(state.entities['SERV:scene:s1']?.[Scene.ATTR_NAME]).toBe('New');
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
        { [Base.ATTR_ADDRESS]: 'SERV:scene:a', [Scene.ATTR_NAME]: 'A' },
        { [Base.ATTR_ADDRESS]: 'SERV:scene:b', [Scene.ATTR_NAME]: 'B' },
      ]),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['SERV:scene:old']).toBeUndefined();
    expect(state.entities['SERV:scene:a']?.[Scene.ATTR_NAME]).toBe('A');
  });

  it('scenesClear empties the store', () => {
    let state = reducer(undefined, sceneAdded(makeScene('SERV:scene:s1')));
    state = reducer(state, scenesClear());
    expect(state.ids).toEqual([]);
  });
});
