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
import { setAuthenticating, loginFailed } from '../slices/authSlice';
import { initializeCoreConfig } from './initConfig';
import { waitForSession, completeSession } from '../utils/sessionFlow';

export const authenticateThunk = createAsyncThunk(
  'auth/authenticate',
  async (_, { dispatch }) => {
    initializeCoreConfig();
    dispatch(setAuthenticating(true));

    try {
      const session = await waitForSession(() => auth.authenticate(), 'No valid session');
      const placeId = await completeSession(session, dispatch);
      return { session, placeId };
    } catch {
      // Expected when there's no session cookie.
      dispatch(loginFailed());
      return null;
    }
  },
);
