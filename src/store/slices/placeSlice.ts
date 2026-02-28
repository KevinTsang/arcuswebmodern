import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PlaceState {
  placeId: string | null;
  place: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  products: Record<string, unknown>[];
  ready: boolean;
}

const initialState: PlaceState = {
  placeId: null,
  place: null,
  preferences: null,
  products: [],
  ready: false,
};

const placeSlice = createSlice({
  name: 'place',
  initialState,
  reducers: {
    setPlaceId(state, action: PayloadAction<string>) {
      state.placeId = action.payload;
      state.ready = false;
    },
    setPlace(state, action: PayloadAction<Record<string, unknown>>) {
      state.place = action.payload;
    },
    setPreferences(state, action: PayloadAction<Record<string, unknown>>) {
      state.preferences = action.payload;
    },
    setProducts(state, action: PayloadAction<Record<string, unknown>[]>) {
      state.products = action.payload;
    },
    setReady(state, action: PayloadAction<boolean>) {
      state.ready = action.payload;
    },
    clearPlace(state) {
      state.placeId = null;
      state.place = null;
      state.preferences = null;
      state.products = [];
      state.ready = false;
    },
  },
});

export const { setPlaceId, setPlace, setPreferences, setProducts, setReady, clearPlace } = placeSlice.actions;
export default placeSlice.reducer;
