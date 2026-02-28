import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface SubsystemEntity {
  id: string;
  'base:address': string;
  [key: string]: unknown;
}

const subsystemsAdapter = createEntityAdapter<SubsystemEntity>();

const subsystemsSlice = createSlice({
  name: 'subsystems',
  initialState: subsystemsAdapter.getInitialState(),
  reducers: {
    subsystemAdded: subsystemsAdapter.addOne,
    subsystemUpdated(state, action: PayloadAction<{ 'base:address': string; [key: string]: unknown }>) {
      const address = action.payload['base:address'];
      const { 'base:address': _, ...changes } = action.payload;
      subsystemsAdapter.updateOne(state, { id: address, changes });
    },
    subsystemRemoved: subsystemsAdapter.removeOne,
    subsystemsReceived(state, action: PayloadAction<Array<{ 'base:address': string; [key: string]: unknown }>>) {
      const entities = action.payload.map((s) => ({ ...s, id: s['base:address'] }));
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
