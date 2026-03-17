import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Base } from '@arcus/core';
import type { SceneEntity, ArcusPayload } from '../entityTypes';

export type { SceneEntity } from '../entityTypes';

const scenesAdapter = createEntityAdapter<SceneEntity>();

const scenesSlice = createSlice({
  name: 'scenes',
  initialState: scenesAdapter.getInitialState(),
  reducers: {
    sceneAdded: scenesAdapter.addOne,
    sceneUpdated(state, action: PayloadAction<ArcusPayload>) {
      const address = action.payload[Base.ATTR_ADDRESS];
      const { [Base.ATTR_ADDRESS]: _, ...changes } = action.payload;
      scenesAdapter.updateOne(state, { id: address, changes });
    },
    sceneRemoved: scenesAdapter.removeOne,
    scenesReceived(state, action: PayloadAction<ArcusPayload[]>) {
      const entities = action.payload.map((s) => ({ ...s, id: s[Base.ATTR_ADDRESS] }));
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
