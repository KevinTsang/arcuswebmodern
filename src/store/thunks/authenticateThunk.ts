/**
 * Async thunk to re-authenticate using the platform's irisAuthToken cookie.
 * Called on app mount to restore session state.
 *
 * Same flow as loginThunk but skips the POST — just opens WebSocket.
 * The browser sends the irisAuthToken cookie automatically on the
 * WebSocket upgrade handshake; the platform validates it and fires
 * SessionCreated if the session is still valid.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import Bridge from '@arcus/core/bridge';
import { Base } from '@arcus/core';
import { SessionService } from '@arcus/core/services';
import type { SessionCreatedEvent, Account } from '@/arcus/types';
import type { PersonData } from '@/store/entityTypes';
import { setAuthenticating, loginSuccess, loginFailed } from '../slices/authSlice';
import { initializeCoreConfig } from './initConfig';
import { getDefaultPlaceId } from './placeSelection';

export const authenticateThunk = createAsyncThunk(
  'auth/authenticate',
  async (_, { dispatch }) => {
    initializeCoreConfig();
    dispatch(setAuthenticating(true));

    try {
      const session = await new Promise<SessionCreatedEvent>((resolve, reject) => {
        const onSuccess = (data: SessionCreatedEvent) => {
          auth.off('authentication:success', onSuccess);
          auth.off('authentication:fail', onFail);
          resolve(data);
        };
        const onFail = () => {
          auth.off('authentication:success', onSuccess);
          auth.off('authentication:fail', onFail);
          reject(new Error('No valid session'));
        };

        auth.on('authentication:success', onSuccess);
        auth.on('authentication:fail', onFail);

        auth.authenticate().catch(reject);
      });

      const { personId, places = [] } = session;

      // Determine default place (same logic as arcusweb PlaceManager)
      const placeId = getDefaultPlaceId(places, personId);

      if (placeId) {
        // Scope the platform session to this place
        await SessionService.SetActivePlace(placeId);
      }

      // Fetch the account for the selected place, plus the person's own
      // attributes — SessionCreated only carries personId, not name/email/phone.
      const selectedPlace = places.find((p) => p.placeId === placeId);
      if (!selectedPlace?.accountId) {
        throw new Error('No account found for the selected place');
      }
      const [account, person] = await Promise.all([
        Bridge.request<Account>(Base.CMD_GETATTRIBUTES, `SERV:account:${selectedPlace.accountId}`, {}),
        Bridge.request<PersonData>(Base.CMD_GETATTRIBUTES, `SERV:person:${personId}`, {}),
      ]);

      dispatch(loginSuccess({ person: { ...session, ...person }, account }));
      return { session, placeId };
    } catch {
      dispatch(loginFailed());
      return null;
    }
  },
);
