import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Base } from '@arcus/core';
import type { SchedulerEntity, ArcusPayload } from '../entityTypes';

export type { SchedulerEntity } from '../entityTypes';

const schedulersAdapter = createEntityAdapter<SchedulerEntity>();

const schedulersSlice = createSlice({
  name: 'schedulers',
  initialState: schedulersAdapter.getInitialState(),
  reducers: {
    schedulerAdded: schedulersAdapter.addOne,
    schedulerUpdated(state, action: PayloadAction<ArcusPayload>) {
      const address = action.payload[Base.ATTR_ADDRESS];
      const { [Base.ATTR_ADDRESS]: _, ...changes } = action.payload;
      schedulersAdapter.updateOne(state, { id: address, changes });
    },
    schedulerRemoved: schedulersAdapter.removeOne,
    schedulersReceived(state, action: PayloadAction<ArcusPayload[]>) {
      const entities = action.payload.map((s) => ({ ...s, id: s[Base.ATTR_ADDRESS] }));
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
