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
    try {
      await auth.logout();
    } catch {
      // Ensure we logout even if the request fails
    } finally {
      dispatch(logout());
    }
  },
);
