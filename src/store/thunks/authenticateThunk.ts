/**
 * Async thunk to re-authenticate using an existing session cookie.
 * Called on app mount to restore session state.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import Bridge from '@arcus/core/bridge';
import { SessionService } from '@arcus/core/services';
import { setAuthenticating, loginSuccess, loginFailed } from '../slices/authSlice';
import { createSession } from '@/app/actions/session';
import { initializeCoreConfig } from './initConfig';

export const authenticateThunk = createAsyncThunk(
  'auth/authenticate',
  async (_, { dispatch }) => {
    initializeCoreConfig();
    dispatch(setAuthenticating(true));

    try {
      const sessionData = await new Promise<Record<string, any>>((resolve, reject) => {
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

      const person = sessionData;
      let account: Record<string, any> = {};

      const accountId = person['person:accountId'];
      if (accountId) {
        try {
          account = await Bridge.request('base:GetAttributes', `SERV:account:${accountId}`, {});
        } catch {
          // OK if account fetch fails
        }
      }

      // Determine placeId: prefer localStorage, fall back to person:currPlace
      const personId = person['base:id'] as string;
      const storedPlaceId = typeof window !== 'undefined'
        ? localStorage.getItem('arcus:placeId')
        : null;
      const placeId = storedPlaceId
        ?? (person['person:currPlace'] as string)
        ?? undefined;

      if (placeId) {
        // Scope the platform session to this place
        await SessionService.SetActivePlace(placeId);
        // Set server-side cookie for SSR/middleware
        await createSession(personId, placeId);
      }

      dispatch(loginSuccess({ person, account }));
      return { person, account, placeId };
    } catch {
      dispatch(loginFailed());
      return null;
    }
  },
);
