/**
 * Async thunk for logout.
 * Calls auth.logout() and dispatches logout.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import { logout } from '../slices/authSlice';

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    // Dispatch logout first to unsubscribe cornea event listeners before
    // closing the socket. This prevents the server's 4001 close code from
    // being misinterpreted as a session expiry.
    dispatch(logout());
    try {
      await auth.logout();
    } catch {
      // Best-effort — state is already cleared
    }
  },
);
