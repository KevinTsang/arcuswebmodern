/**
 * Async thunk to switch the active place.
 *
 * Calls SessionService.SetActivePlace, remembers the place for session
 * restore, refreshes the account if the new place belongs to a different
 * account, then loads all data for the new place.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import Bridge from '@arcus/core/bridge';
import { Base } from '@arcus/core';
import { SessionService } from '@arcus/core/services';
import type { Account } from '@/arcus/types';
import { accountUpdated } from '../slices/authSlice';
import { loadPlaceDataThunk } from './loadPlaceDataThunk';

export const switchPlaceThunk = createAsyncThunk<string, string, { state: RootState }>(
  'place/switchPlace',
  async (placeId, { dispatch, getState }) => {
    // Tell the platform to switch the active place for this session
    await SessionService.SetActivePlace(placeId);

    // Persist so a reload restores this place (read by getDefaultPlaceId)
    localStorage.setItem(`arcus:placeId`, placeId);

    // The new place may belong to a different account (e.g. a place you're a
    // guest at). The platform has already switched, so a failed account fetch
    // shouldn't fail the switch: log it and keep the previous account.
    const { person, account } = getState().auth;
    const accountId = person?.places?.find((p) => p.placeId === placeId)?.accountId;
    const accountAddress = accountId ? `SERV:account:${accountId}` : undefined;
    const accountRequest =
      accountAddress && account?.[Base.ATTR_ADDRESS] !== accountAddress
        ? Bridge.request<Account>(Base.CMD_GETATTRIBUTES, accountAddress, {})
            .then((newAccount) => {
              dispatch(accountUpdated(newAccount));
            })
            .catch((e) => {
              console.error('Failed to load account for place:', e);
            })
        : Promise.resolve();

    // Load all data for the new place
    await dispatch(loadPlaceDataThunk(placeId)).unwrap();
    await accountRequest;

    return placeId;
  },
);
