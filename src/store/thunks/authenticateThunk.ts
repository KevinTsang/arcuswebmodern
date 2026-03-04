/**
 * Async thunk to re-authenticate using an existing session cookie.
 * Called on app mount to restore session state.
 *
 * Same flow as loginThunk but skips the POST — just opens WebSocket
 * (the platform auth cookie is already set from a previous login).
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import { SessionService } from '@arcus/core/services';
import { setAuthenticating, loginSuccess, loginFailed } from '../slices/authSlice';
import { createSession } from '@/app/actions/session';
import { initializeCoreConfig } from './initConfig';
import { getDefaultPlaceId } from './placeSelection';

export const authenticateThunk = createAsyncThunk(
  'auth/authenticate',
  async (_, { dispatch }) => {
    initializeCoreConfig();
    dispatch(setAuthenticating(true));

    try {
      const session = await new Promise<Record<string, any>>((resolve, reject) => {
        const onSuccess = (data: Record<string, any>) => {
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
        // Set server-side cookie for SSR/middleware
        await createSession(personId, placeId);
      }

      dispatch(loginSuccess({ person: session, account: {} }));
      return { session, placeId };
    } catch {
      dispatch(loginFailed());
      return null;
    }
  },
);
