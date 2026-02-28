import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  authenticating: boolean;
  authenticated: boolean;
  sessionToken: string | null;
  person: Record<string, unknown> | null;
  account: Record<string, unknown> | null;
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
    loginSuccess(state, action: PayloadAction<{ person: Record<string, unknown>; account: Record<string, unknown> }>) {
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
