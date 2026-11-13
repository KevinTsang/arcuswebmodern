import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Base } from '@arcus/core';
import type { SessionCreatedEvent, Account } from '@/arcus/types';
import { personUpdated } from './peopleSlice';

export interface AuthState {
  authenticating: boolean;
  authenticated: boolean;
  sessionExpired: boolean;
  person: SessionCreatedEvent | null;
  account: Account | null;
}

const initialState: AuthState = {
  authenticating: false,
  authenticated: false,
  sessionExpired: false,
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
      state.sessionExpired = false;
      state.person = action.payload.person;
      state.account = action.payload.account;
    },
    accountUpdated(state, action: PayloadAction<Account>) {
      state.account = action.payload;
    },
    loginFailed(state) {
      state.authenticated = false;
      state.authenticating = false;
      state.person = null;
      state.account = null;
    },
    logout(state) {
      state.authenticated = false;
      state.authenticating = false;
      state.sessionExpired = false;
      state.person = null;
      state.account = null;
    },
    /**
     * The platform ended this socket's session (another client signed in, or
     * it expired). Hold the app on its loading screen while
     * resumeSessionThunk tries the browser's current session cookie, which a
     * newer sign-in on another tab or client may have replaced.
     */
    sessionResuming(state) {
      state.authenticated = false;
      state.authenticating = true;
      state.sessionExpired = false;
    },
    sessionExpired(state) {
      state.authenticated = false;
      state.authenticating = false;
      state.sessionExpired = true;
      state.person = null;
      state.account = null;
    },
  },
  extraReducers: (builder) => {
    // Keep the signed-in person current when the platform reports a change
    // to them (e.g. after editing contact info).
    builder.addCase(personUpdated, (state, action) => {
      // Match on personId: base:address is missing if the person fetch failed.
      if (state.person && action.payload[Base.ATTR_ADDRESS] === `SERV:person:${state.person.personId}`) {
        Object.assign(state.person, action.payload);
      }
    });
  },
});

export const { setAuthenticating, loginSuccess, accountUpdated, loginFailed, logout, sessionResuming, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
