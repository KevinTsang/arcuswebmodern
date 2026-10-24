/**
 * Async thunk for login with username and password.
 *
 * Follows the arcusweb flow (auth.login → SessionCreated → SetActivePlace):
 * 1. POST credentials + open WebSocket
 * 2. Wait for SessionCreated event (payload: { personId, places[] })
 * 3. Determine placeId from places array (OWNER first, then alphabetical)
 * 4. SessionService.SetActivePlace(placeId)
 * 5. createSession() server action (server-side cookie)
 * 6. Store placeId in localStorage
 * 7. Dispatch loginSuccess
 * 8. Return { session, placeId }
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

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    { username, password, isPublic }: { username: string; password: string; isPublic: boolean },
    { dispatch },
  ) => {
    initializeCoreConfig();
    dispatch(setAuthenticating(true));

    try {
      // auth.login() POSTs credentials then opens WebSocket.
      // SessionCreated fires once the server confirms the session.
      const session = await new Promise<SessionCreatedEvent>((resolve, reject) => {
        const onSuccess = (data: SessionCreatedEvent) => {
          auth.off('authentication:success', onSuccess);
          auth.off('authentication:fail', onFail);
          resolve(data);
        };
        const onFail = () => {
          auth.off('authentication:success', onSuccess);
          auth.off('authentication:fail', onFail);
          reject(new Error('Authentication failed'));
        };

        auth.on('authentication:success', onSuccess);
        auth.on('authentication:fail', onFail);

        auth.login(username, password, isPublic).catch(reject);
      });

      const { personId, places = [] } = session;

      // Determine default place (same logic as arcusweb PlaceManager)
      const placeId = getDefaultPlaceId(places, personId);

      if (placeId) {
        // Scope the platform session to this place
        await SessionService.SetActivePlace(placeId);
        // Persist for session restore
        localStorage.setItem(`arcus:placeId`, placeId);
      }

      // SessionCreated only carries personId, not name/email/phone. The person
      // request can fail if it reaches the platform before the session has an
      // active place, so fetch it now, alongside the account. It's optional:
      // a failure falls back to the session payload.
      const personRequest = Bridge.request<PersonData>(Base.CMD_GETATTRIBUTES, `SERV:person:${personId}`, {})
        .catch((e) => {
          console.error('Failed to load person attributes:', e);
          return null;
        });

      // Fetch the account object for the selected place
      const selectedPlace = places.find((p) => p.placeId === placeId);
      if (!selectedPlace?.accountId) {
        throw new Error('No account found for the selected place');
      }
      const account = await Bridge.request<Account>(
        Base.CMD_GETATTRIBUTES,
        `SERV:account:${selectedPlace.accountId}`,
        {},
      );
      const person = await personRequest;

      dispatch(loginSuccess({ person: { ...session, ...person }, account }));
      return { session, placeId };
    } catch (error) {
      dispatch(loginFailed());
      throw error;
    }
  },
);
