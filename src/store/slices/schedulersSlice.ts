import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Base, Scheduler } from '@arcus/core';
import type { SchedulerEntity, SchedulerData, ArcusPayload } from '../entityTypes';

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
    schedulersReceived(state, action: PayloadAction<SchedulerData[]>) {
      const entities = action.payload.map((s) => ({ ...s, id: s[Base.ATTR_ADDRESS] as string }));
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

/**
 * Find the scheduler for a scheduled object (device/scene/rule). Schedulers are
 * keyed by their own address, so a target's scheduler must be looked up via its
 * `scheduler:target` — not by the target address directly.
 */
export const selectSchedulerByTarget = (
  state: RootState,
  targetAddress: string,
): SchedulerEntity | undefined =>
  selectAllSchedulers(state).find((s) => s[Scheduler.ATTR_TARGET] === targetAddress);

export default schedulersSlice.reducer;
