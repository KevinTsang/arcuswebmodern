import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ArcusPayload } from '@/store/entityTypes';

export interface HubState {
  hub: ArcusPayload | null;
}

const initialState: HubState = {
  hub: null,
};

const hubSlice = createSlice({
  name: 'hub',
  initialState,
  reducers: {
    setHub(state, action: PayloadAction<ArcusPayload>) {
      state.hub = action.payload;
    },
    updateHub(state, action: PayloadAction<ArcusPayload>) {
      if (state.hub) {
        Object.assign(state.hub, action.payload);
      }
    },
    clearHub(state) {
      state.hub = null;
    },
  },
});

export const { setHub, updateHub, clearHub } = hubSlice.actions;
export default hubSlice.reducer;
