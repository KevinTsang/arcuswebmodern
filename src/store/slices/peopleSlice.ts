import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface PersonEntity {
  id: string;
  'base:address': string;
  [key: string]: unknown;
}

const peopleAdapter = createEntityAdapter<PersonEntity>();

const peopleSlice = createSlice({
  name: 'people',
  initialState: peopleAdapter.getInitialState(),
  reducers: {
    personAdded: peopleAdapter.addOne,
    personUpdated(state, action: PayloadAction<{ 'base:address': string; [key: string]: unknown }>) {
      const address = action.payload['base:address'];
      const { 'base:address': _, ...changes } = action.payload;
      peopleAdapter.updateOne(state, { id: address, changes });
    },
    personRemoved: peopleAdapter.removeOne,
    peopleReceived(state, action: PayloadAction<Array<{ 'base:address': string; [key: string]: unknown }>>) {
      const entities = action.payload.map((p) => ({ ...p, id: p['base:address'] }));
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
