import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Base } from '@arcus/core';
import type { PlaceData } from '@/components/settings/types';

/**
 * A place `base:ValueChange`: the place's address plus only the attributes
 * that changed.
 */
export type PlaceChange = Pick<PlaceData, typeof Base.ATTR_ADDRESS> & Partial<PlaceData>;

export interface PlaceState {
  placeId: string | null;
  place: PlaceData | null;
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
    /**
     * Start loading a place. `place` only ever holds the record of `placeId`,
     * so switching to a different place drops the previous place's record.
     */
    setPlaceId(state, action: PayloadAction<string>) {
      if (action.payload !== state.placeId) {
        state.place = null;
      }
      state.placeId = action.payload;
      state.ready = false;
    },
    /**
     * Store a full load (base:GetAttributes) of the active place. A record for
     * any other place — e.g. a load that finished after the user switched
     * again — is ignored.
     */
    setPlace(state, action: PayloadAction<PlaceData>) {
      if (action.payload[Base.ATTR_ID] !== state.placeId) return;
      state.place = action.payload;
    },
    /**
     * Merge a place `base:ValueChange` into the loaded active place. The
     * platform also sends ValueChanges for other places the session edits
     * (e.g. another place from Settings), so events for any other place, or
     * before the active place has loaded, are ignored.
     */
    updatePlace(state, action: PayloadAction<PlaceChange>) {
      if (state.place?.[Base.ATTR_ADDRESS] !== action.payload[Base.ATTR_ADDRESS]) return;
      Object.assign(state.place, action.payload);
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

export const { setPlaceId, setPlace, updatePlace, setPreferences, setProducts, setReady, clearPlace } = placeSlice.actions;
export default placeSlice.reducer;
