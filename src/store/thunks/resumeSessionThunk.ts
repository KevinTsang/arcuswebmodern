/**
 * Async thunk that adopts the browser's current platform session after the
 * platform ends this socket's session.
 *
 * The platform session lives in the HttpOnly `irisAuthToken` cookie, which the
 * browser keeps per platform host — not per page — so every same-site client
 * in the browser shares it: other tabs, the deployed dev client, and a local
 * `npm run dev` instance on `localdev.<domain>`. Signing in on any of them
 * makes the platform end the previous session (closing its sockets with 4001
 * or pushing `sess:SessionExpired`) and stores the new token in that shared
 * cookie. Rather than bouncing to /login, the other clients reconnect with the
 * cookie as a page reload would, and only report the session expired when that
 * fails (signed out everywhere, or the session really is too old).
 *
 * No token is read or handled here: the browser attaches the cookie to the
 * WebSocket handshake, exactly as in authenticateThunk.
 *
 * The caller dispatches sessionResuming() first, which unsubscribes the Cornea
 * listeners of the ended session (see corneaMiddleware).
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import type { RootState } from '../store';
import { sessionExpired } from '../slices/authSlice';
import { waitForSession, completeSession } from '../utils/sessionFlow';
import { loadPlaceDataThunk } from './loadPlaceDataThunk';

/**
 * A session the platform ends again this soon after being adopted is treated
 * as expired, so a cookie the platform keeps accepting and then ending can't
 * loop the client through reconnects.
 */
export const RESUME_COOLDOWN_MS = 30 * 1000;

let lastResumedAt = Number.NEGATIVE_INFINITY;

export const resumeSessionThunk = createAsyncThunk<boolean, void, { state: RootState }>(
  'auth/resumeSession',
  async (_, { dispatch }) => {
    // Drop the ended session's socket without contacting the platform.
    auth.reset();

    const now = Date.now();
    if (now - lastResumedAt < RESUME_COOLDOWN_MS) {
      dispatch(sessionExpired());
      return false;
    }
    lastResumedAt = now;

    try {
      const session = await waitForSession(() => auth.authenticate(), 'No replacement session');
      const placeId = await completeSession(session, dispatch);
      // Events sent while this client was disconnected were missed, so reload
      // the place rather than keep showing what it had before.
      if (placeId) dispatch(loadPlaceDataThunk(placeId));
      return true;
    } catch (error) {
      console.warn('Could not resume the platform session:', error);
      auth.reset();
      dispatch(sessionExpired());
      return false;
    }
  },
);
