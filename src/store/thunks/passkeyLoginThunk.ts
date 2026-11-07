/**
 * Async thunk for login with a passkey.
 *
 * auth.loginWithPasskey() prompts for a passkey, logs in with it and opens the
 * WebSocket; the rest of the flow is shared with password login and session
 * restore in ../utils/sessionFlow. Returns { session, placeId }, or rejects
 * with a PasskeyLoginFailure saying why.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import type { SessionCreatedEvent } from '@/arcus/types';
import { classifyPasskeyLoginError, type PasskeyLoginFailure } from '@/lib/passkeyLoginFailure';
import { setAuthenticating, loginFailed } from '../slices/authSlice';
import { initializeCoreConfig } from './initConfig';
import { waitForSession, completeSession, SessionStepError } from '../utils/sessionFlow';

interface PasskeyLoginResult {
  session: SessionCreatedEvent;
  placeId: string | undefined;
}

/** Which part of signing in failed, and so what to tell the person. */
function failureOf(error: unknown): PasskeyLoginFailure {
  if (!(error instanceof SessionStepError)) return 'unknown';
  switch (error.step) {
    // The passkey requests, the browser prompt and opening the socket.
    case 'connect':
      return classifyPasskeyLoginError(error.reason);
    // The passkey was accepted, but the socket closed before the session started.
    case 'SessionCreated':
      return 'connection';
    default:
      return 'unknown';
  }
}

export const passkeyLoginThunk = createAsyncThunk<
  PasskeyLoginResult,
  { isPublic: boolean },
  { rejectValue: PasskeyLoginFailure }
>(
  'auth/passkeyLogin',
  async ({ isPublic }, { dispatch, rejectWithValue }) => {
    initializeCoreConfig();
    dispatch(setAuthenticating(true));

    try {
      const session = await waitForSession(
        () => auth.loginWithPasskey(isPublic),
        'Authentication failed',
      );
      const placeId = await completeSession(session, dispatch);
      return { session, placeId };
    } catch (error) {
      // Drop the socket so nothing keeps reconnecting behind the login form.
      auth.reset();
      dispatch(loginFailed());
      return rejectWithValue(failureOf(error));
    }
  },
);
