import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Base } from '@arcus/core';
import type { PlaceData } from '@/components/settings/types';
import type { ArcusPayload } from '../entityTypes';

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
    setPlaceId(state, action: PayloadAction<string>) {
      state.placeId = action.payload;
      state.ready = false;
    },
    /** Replace the active place record with a full load (base:GetAttributes). */
    setPlace(state, action: PayloadAction<PlaceData>) {
      state.place = action.payload;
    },
    /**
     * Merge a place `base:ValueChange` — the address plus only the changed
     * attributes — into the loaded active place. The platform broadcasts
     * ValueChanges for any place the session edits (e.g. another place from
     * Settings) to the active place's subscribers, so events for any other
     * place, or before the active place has loaded, are ignored.
     */
    updatePlace(state, action: PayloadAction<ArcusPayload>) {
      const address = action.payload[Base.ATTR_ADDRESS];
      if (
        !state.place
        || !state.placeId
        || address !== `SERV:place:${state.placeId}`
        || address !== state.place[Base.ATTR_ADDRESS]
      ) {
        return;
      }
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
