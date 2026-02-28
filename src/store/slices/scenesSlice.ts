import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface SceneEntity {
  id: string;
  'base:address': string;
  [key: string]: unknown;
}

const scenesAdapter = createEntityAdapter<SceneEntity>();

const scenesSlice = createSlice({
  name: 'scenes',
  initialState: scenesAdapter.getInitialState(),
  reducers: {
    sceneAdded: scenesAdapter.addOne,
    sceneUpdated(state, action: PayloadAction<{ 'base:address': string; [key: string]: unknown }>) {
      const address = action.payload['base:address'];
      const { 'base:address': _, ...changes } = action.payload;
      scenesAdapter.updateOne(state, { id: address, changes });
    },
    sceneRemoved: scenesAdapter.removeOne,
    scenesReceived(state, action: PayloadAction<Array<{ 'base:address': string; [key: string]: unknown }>>) {
      const entities = action.payload.map((s) => ({ ...s, id: s['base:address'] }));
      scenesAdapter.setAll(state, entities);
    },
    scenesClear: scenesAdapter.removeAll,
  },
});

export const {
  sceneAdded,
  sceneUpdated,
  sceneRemoved,
  scenesReceived,
  scenesClear,
} = scenesSlice.actions;

export const {
  selectAll: selectAllScenes,
  selectById: selectSceneByAddress,
} = scenesAdapter.getSelectors((state: RootState) => state.scenes);

export default scenesSlice.reducer;
