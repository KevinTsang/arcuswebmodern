import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface SchedulerEntity {
  id: string;
  'base:address': string;
  [key: string]: unknown;
}

const schedulersAdapter = createEntityAdapter<SchedulerEntity>();

const schedulersSlice = createSlice({
  name: 'schedulers',
  initialState: schedulersAdapter.getInitialState(),
  reducers: {
    schedulerAdded: schedulersAdapter.addOne,
    schedulerUpdated(state, action: PayloadAction<{ 'base:address': string; [key: string]: unknown }>) {
      const address = action.payload['base:address'];
      const { 'base:address': _, ...changes } = action.payload;
      schedulersAdapter.updateOne(state, { id: address, changes });
    },
    schedulerRemoved: schedulersAdapter.removeOne,
    schedulersReceived(state, action: PayloadAction<Array<{ 'base:address': string; [key: string]: unknown }>>) {
      const entities = action.payload.map((s) => ({ ...s, id: s['base:address'] }));
      schedulersAdapter.setAll(state, entities);
    },
    schedulersClear: schedulersAdapter.removeAll,
  },
});

export const {
  schedulerAdded,
  schedulerUpdated,
  schedulerRemoved,
  schedulersReceived,
  schedulersClear,
} = schedulersSlice.actions;

export const {
  selectAll: selectAllSchedulers,
  selectById: selectSchedulerByAddress,
} = schedulersAdapter.getSelectors((state: RootState) => state.schedulers);

export default schedulersSlice.reducer;
