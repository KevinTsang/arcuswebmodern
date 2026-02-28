import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface HubState {
  hub: Record<string, unknown> | null;
}

const initialState: HubState = {
  hub: null,
};

const hubSlice = createSlice({
  name: 'hub',
  initialState,
  reducers: {
    setHub(state, action: PayloadAction<Record<string, unknown>>) {
      state.hub = action.payload;
    },
    updateHub(state, action: PayloadAction<Record<string, unknown>>) {
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
