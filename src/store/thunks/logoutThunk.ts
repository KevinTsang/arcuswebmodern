/**
 * Async thunk for logout.
 * Calls auth.logout(), clears the server-side session cookie, and dispatches logout.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import { logout } from '../slices/authSlice';
import { destroySession } from '@/app/actions/session';

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      await auth.logout();
    } catch {
      // Ensure we logout even if the request fails
    } finally {
      await destroySession();
      dispatch(logout());
    }
  },
);
