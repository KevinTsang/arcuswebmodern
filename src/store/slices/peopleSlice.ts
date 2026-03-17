import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Base } from '@arcus/core';
import type { PersonEntity, ArcusPayload } from '../entityTypes';

export type { PersonEntity } from '../entityTypes';

const peopleAdapter = createEntityAdapter<PersonEntity>();

const peopleSlice = createSlice({
  name: 'people',
  initialState: peopleAdapter.getInitialState(),
  reducers: {
    personAdded: peopleAdapter.addOne,
    personUpdated(state, action: PayloadAction<ArcusPayload>) {
      const address = action.payload[Base.ATTR_ADDRESS];
      const { [Base.ATTR_ADDRESS]: _, ...changes } = action.payload;
      peopleAdapter.updateOne(state, { id: address, changes });
    },
    personRemoved: peopleAdapter.removeOne,
    peopleReceived(state, action: PayloadAction<ArcusPayload[]>) {
      const entities = action.payload.map((p) => ({ ...p, id: p[Base.ATTR_ADDRESS] }));
      peopleAdapter.setAll(state, entities);
    },
    peopleClear: peopleAdapter.removeAll,
  },
});

export const {
  personAdded,
  personUpdated,
  personRemoved,
  peopleReceived,
  peopleClear,
} = peopleSlice.actions;

export const {
  selectAll: selectAllPeople,
  selectById: selectPersonByAddress,
} = peopleAdapter.getSelectors((state: RootState) => state.people);

export default peopleSlice.reducer;
