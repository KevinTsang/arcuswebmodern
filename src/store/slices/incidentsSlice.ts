import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Base } from '@arcus/core';
import type { IncidentEntity, IncidentData, ArcusPayload } from '../entityTypes';

export type { IncidentEntity } from '../entityTypes';

const incidentsAdapter = createEntityAdapter<IncidentEntity>();

const incidentsSlice = createSlice({
  name: 'incidents',
  initialState: incidentsAdapter.getInitialState({
    currentIncident: null as string | null,
  }),
  reducers: {
    incidentAdded: incidentsAdapter.addOne,
    incidentUpdated(state, action: PayloadAction<ArcusPayload>) {
      const address = action.payload[Base.ATTR_ADDRESS];
      const { [Base.ATTR_ADDRESS]: _, ...changes } = action.payload;
      incidentsAdapter.updateOne(state, { id: address, changes });
    },
    incidentRemoved: incidentsAdapter.removeOne,
    incidentsReceived(state, action: PayloadAction<IncidentData[]>) {
      const entities = action.payload.map((i) => ({ ...i, id: i[Base.ATTR_ADDRESS] as string }));
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
