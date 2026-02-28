import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface IncidentEntity {
  id: string;
  'base:address': string;
  [key: string]: unknown;
}

const incidentsAdapter = createEntityAdapter<IncidentEntity>();

const incidentsSlice = createSlice({
  name: 'incidents',
  initialState: incidentsAdapter.getInitialState({
    currentIncident: null as string | null,
  }),
  reducers: {
    incidentAdded: incidentsAdapter.addOne,
    incidentUpdated(state, action: PayloadAction<{ 'base:address': string; [key: string]: unknown }>) {
      const address = action.payload['base:address'];
      const { 'base:address': _, ...changes } = action.payload;
      incidentsAdapter.updateOne(state, { id: address, changes });
    },
    incidentRemoved: incidentsAdapter.removeOne,
    incidentsReceived(state, action: PayloadAction<Array<{ 'base:address': string; [key: string]: unknown }>>) {
      const entities = action.payload.map((i) => ({ ...i, id: i['base:address'] }));
      incidentsAdapter.setAll(state, entities);
    },
    incidentsClear(state) {
      incidentsAdapter.removeAll(state);
      state.currentIncident = null;
    },
    setCurrentIncident(state, action: PayloadAction<string | null>) {
      state.currentIncident = action.payload;
    },
  },
});

export const {
  incidentAdded,
  incidentUpdated,
  incidentRemoved,
  incidentsReceived,
  incidentsClear,
  setCurrentIncident,
} = incidentsSlice.actions;

export const {
  selectAll: selectAllIncidents,
  selectById: selectIncidentByAddress,
} = incidentsAdapter.getSelectors((state: RootState) => state.incidents);

export default incidentsSlice.reducer;
