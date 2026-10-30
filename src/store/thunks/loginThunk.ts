/**
 * Async thunk for login with username and password.
 *
 * auth.login() POSTs the credentials and opens the WebSocket; the rest of the
 * flow (SessionCreated → SetActivePlace → account/person → loginSuccess) is
 * shared with session restore in ../utils/sessionFlow.
 * Returns { session, placeId }.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import { setAuthenticating, loginFailed } from '../slices/authSlice';
import { initializeCoreConfig } from './initConfig';
import { waitForSession, completeSession } from '../utils/sessionFlow';

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    { username, password, isPublic }: { username: string; password: string; isPublic: boolean },
    { dispatch },
  ) => {
    dispatch(setAuthenticating(true));
    await initializeCoreConfig();

    try {
      const session = await waitForSession(
        () => auth.login(username, password, isPublic),
        'Authentication failed',
      );
      const placeId = await completeSession(session, dispatch);
      return { session, placeId };
    } catch (error) {
      // Drop the socket so nothing keeps reconnecting behind the login form.
      auth.reset();
      dispatch(loginFailed());
      throw error;
    }
  },
);
