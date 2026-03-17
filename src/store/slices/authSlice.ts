import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SessionCreatedEvent, Account } from '@/arcus/types';

export interface AuthState {
  authenticating: boolean;
  authenticated: boolean;
  sessionToken: string | null;
  person: SessionCreatedEvent | null;
  account: Account | null;
}

const initialState: AuthState = {
  authenticating: false,
  authenticated: false,
  sessionToken: null,
  person: null,
  account: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticating(state, action: PayloadAction<boolean>) {
      state.authenticating = action.payload;
    },
    loginSuccess(state, action: PayloadAction<{ person: SessionCreatedEvent; account: Account }>) {
      state.authenticated = true;
      state.authenticating = false;
      state.person = action.payload.person;
      state.account = action.payload.account;
    },
    loginFailed(state) {
      state.authenticated = false;
      state.authenticating = false;
      state.sessionToken = null;
      state.person = null;
      state.account = null;
    },
    logout(state) {
      state.authenticated = false;
      state.authenticating = false;
      state.sessionToken = null;
      state.person = null;
      state.account = null;
    },
  },
});

export const { setAuthenticating, loginSuccess, loginFailed, logout } = authSlice.actions;
export default authSlice.reducer;
