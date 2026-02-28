/**
 * Async thunk to switch the active place.
 *
 * Calls SessionService.SetActivePlace, then loads all data for the new place.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { SessionService } from '@arcus/core/services';
import { loadPlaceDataThunk } from './loadPlaceDataThunk';

export const switchPlaceThunk = createAsyncThunk(
  'place/switchPlace',
  async (placeId: string, { dispatch }) => {
    // Tell the platform to switch the active place for this session
    await SessionService.SetActivePlace(placeId);

    // Load all data for the new place
    await dispatch(loadPlaceDataThunk(placeId)).unwrap();

    return placeId;
  },
);
