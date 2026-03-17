import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Base } from '@arcus/core';
import type { SubsystemEntity, ArcusPayload } from '../entityTypes';

export type { SubsystemEntity } from '../entityTypes';

const subsystemsAdapter = createEntityAdapter<SubsystemEntity>();

const subsystemsSlice = createSlice({
  name: 'subsystems',
  initialState: subsystemsAdapter.getInitialState(),
  reducers: {
    subsystemAdded: subsystemsAdapter.addOne,
    subsystemUpdated(state, action: PayloadAction<ArcusPayload>) {
      const address = action.payload[Base.ATTR_ADDRESS];
      const { [Base.ATTR_ADDRESS]: _, ...changes } = action.payload;
      subsystemsAdapter.updateOne(state, { id: address, changes });
    },
    subsystemRemoved: subsystemsAdapter.removeOne,
    subsystemsReceived(state, action: PayloadAction<ArcusPayload[]>) {
      const entities = action.payload.map((s) => ({ ...s, id: s[Base.ATTR_ADDRESS] }));
      subsystemsAdapter.setAll(state, entities);
    },
    subsystemsClear: subsystemsAdapter.removeAll,
  },
});

export const {
  subsystemAdded,
  subsystemUpdated,
  subsystemRemoved,
  subsystemsReceived,
  subsystemsClear,
} = subsystemsSlice.actions;

export const {
  selectAll: selectAllSubsystems,
  selectById: selectSubsystemByAddress,
} = subsystemsAdapter.getSelectors((state: RootState) => state.subsystems);

export default subsystemsSlice.reducer;
