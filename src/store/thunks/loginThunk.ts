/**
 * Async thunks for authentication.
 *
 * Replaces the auth flow from src/models/auth.js and the session
 * handling in src/app.js.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import { setConfig } from '@arcus/core/config';
import Bridge from '@arcus/core/bridge';
import { SessionService } from '@arcus/core/services';
import { setAuthenticating, loginSuccess, loginFailed, logout } from '../slices/authSlice';

/**
 * Initialize the @arcus/core config from Next.js env vars.
 * Must be called before any auth or service calls.
 */
export function initializeCoreConfig(): void {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? '';
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
  const redirectUrl = process.env.NEXT_PUBLIC_REDIRECT_URL ?? '';
  const isProduction = process.env.NODE_ENV === 'production';

  setConfig({ apiUrl, wsUrl, version, redirectUrl, isProduction });
  Bridge.configure({ apiUrl, version });
}

/**
 * Log in with username and password.
 * 1. Calls auth.login() to POST credentials and open WebSocket
 * 2. Waits for SessionCreated event with person/account data
 * 3. Dispatches loginSuccess with person + account
 */
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    { username, password, isPublic }: { username: string; password: string; isPublic?: string },
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

      // The SessionCreated event payload contains person and account attributes
      // Load full person and account from session
      const person = sessionData;
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

      dispatch(loginSuccess({ person, account }));
      return { person, account };
    } catch (error) {
      dispatch(loginFailed());
      throw error;
    }
  },
);

/**
 * Attempt to re-authenticate using an existing session cookie.
 * Called on app mount to restore session state.
 */
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

      dispatch(loginSuccess({ person, account }));
      return { person, account };
    } catch {
      dispatch(loginFailed());
      return null;
    }
  },
);

/**
 * Log out: calls auth.logout(), clears cornea, dispatches logout action.
 */
export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      await auth.logout();
    } catch {
      // Ensure we logout even if the request fails
    }
    dispatch(logout());
  },
);
