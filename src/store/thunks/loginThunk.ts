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
import { SessionService } from '@arcus/core/services';
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
      const session = await new Promise<Record<string, any>>((resolve, reject) => {
        const onSuccess = (data: Record<string, any>) => {
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

      // SessionCreated payload: { personId, places[], ... }
      const personId = session.personId as string;
      const places = (session.places ?? []) as Array<{
        placeId: string;
        placeName: string;
        accountId: string;
        role: string;
      }>;

      // Determine default place (same logic as arcusweb PlaceManager)
      const placeId = getDefaultPlaceId(places, personId);

      if (placeId) {
        // Scope the platform session to this place
        await SessionService.SetActivePlace(placeId);
        // Persist for session restore
        localStorage.setItem(`arcus:placeId`, placeId);
      }

      dispatch(loginSuccess({ person: session, account: {} }));
      return { session, placeId };
    } catch (error) {
      dispatch(loginFailed());
      throw error;
    }
  },
);
