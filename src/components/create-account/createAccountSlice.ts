/**
 * Create-account wizard state, as a Redux Toolkit slice.
 *
 * The wizard is page-local (it holds the password being typed), so the slice
 * is not registered with the global store: `CreateAccountProvider` runs its
 * reducer through `useReducer` and the steps dispatch the generated action
 * creators.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SessionCreatedEvent } from '@/arcus/types';
import { initialState, type FormBooleanField, type FormStringField, type Step } from './types';

/** A single form field change; boolean fields and string fields are typed separately. */
export type FieldChange =
  | { field: FormStringField; value: string }
  | { field: FormBooleanField; value: boolean };

const createAccountSlice = createSlice({
  name: 'createAccount',
  initialState,
  reducers: {
    setField(state, { payload }: PayloadAction<FieldChange>) {
      if (payload.field === 'optIn') {
        state.optIn = payload.value;
      } else {
        state[payload.field] = payload.value;
      }
    },
    setStep(state, { payload }: PayloadAction<Step>) {
      state.step = payload;
    },
    setLoading(state, { payload }: PayloadAction<boolean>) {
      state.loading = payload;
      // Starting a request clears any stale PIN error.
      if (payload) state.pinError = null;
    },
    setError(state, { payload }: PayloadAction<string>) {
      state.error = payload;
    },
    clearError(state) {
      state.error = '';
    },
    accountCreated(
      state,
      { payload }: PayloadAction<{ personData: SessionCreatedEvent; placeId: string | null }>,
    ) {
      state.personData = payload.personData;
      state.placeId = payload.placeId;
      state.step = 'address';
    },
    setPinError(state, { payload }: PayloadAction<string | null>) {
      state.pinError = payload;
    },
  },
});

export const {
  setField,
  setStep,
  setLoading,
  setError,
  clearError,
  accountCreated,
  setPinError,
} = createAccountSlice.actions;

export const createAccountReducer = createAccountSlice.reducer;

/** Union of every action the wizard can dispatch. */
export type CreateAccountAction = ReturnType<
  (typeof createAccountSlice.actions)[keyof typeof createAccountSlice.actions]
>;

export default createAccountSlice;
