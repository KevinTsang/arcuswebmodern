/**
 * Async thunk for login with username and password.
 *
 * 1. POST credentials + open WebSocket
 * 2. Wait for SessionCreated event
 * 3. Fetch account data
 * 4. Determine placeId
 * 5. SessionService.SetActivePlace(placeId)
 * 6. createSession() server action (server-side cookie)
 * 7. Store placeId in localStorage
 * 8. Dispatch loginSuccess
 * 9. Return { person, account, placeId }
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import Bridge from '@arcus/core/bridge';
import { SessionService } from '@arcus/core/services';
import { setAuthenticating, loginSuccess, loginFailed } from '../slices/authSlice';
import { createSession } from '@/app/actions/session';
import { initializeCoreConfig } from './initConfig';

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    { username, password, isPublic }: { username: string; password: string; isPublic: boolean },
    { dispatch },
  ) => {
    initializeCoreConfig();
    dispatch(setAuthenticating(true));

    try {
      // auth.login() opens WebSocket; SessionCreated fires with user data
      const sessionData = await new Promise<Record<string, any>>((resolve, reject) => {
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

      const person = sessionData;
      const personId = person['base:id'] as string;

      // Fetch account data
      const accountId = person['person:currPlace']
        ? undefined
        : person['person:accountId'];

      let account: Record<string, any> = {};
      if (accountId) {
        try {
          account = await Bridge.request('base:GetAttributes', `SERV:account:${accountId}`, {});
        } catch {
          // Account fetch may fail for non-owner, that's OK
        }
      }

      // Determine placeId from person data
      const placeId = (person['person:currPlace'] as string)
        ?? (account['account:owner'] as string)
        ?? undefined;

      if (placeId) {
        // Scope the platform session to this place
        await SessionService.SetActivePlace(placeId);
        // Set server-side cookie for SSR/middleware
        await createSession(personId, placeId, isPublic);
        // Persist for session restore
        localStorage.setItem('arcus:placeId', placeId);
      }

      dispatch(loginSuccess({ person, account }));
      return { person, account, placeId };
    } catch (error) {
      dispatch(loginFailed());
      throw error;
    }
  },
);
