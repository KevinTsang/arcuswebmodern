import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Invitation } from '@arcus/core/services/types';

// Defined in @arcus/core alongside the invitation services; re-exported for the app.
export type { Invitation };

export interface InvitationsState {
  invitations: Invitation[];
  loading: boolean;
}

const initialState: InvitationsState = {
  invitations: [],
  loading: false,
};

const invitationsSlice = createSlice({
  name: 'invitations',
  initialState,
  reducers: {
    setInvitations(state, action: PayloadAction<Invitation[]>) {
      state.invitations = action.payload;
      state.loading = false;
    },
    setInvitationsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    clearInvitations(state) {
      state.invitations = [];
      state.loading = false;
    },
  },
});

export const { setInvitations, setInvitationsLoading, clearInvitations } = invitationsSlice.actions;
export default invitationsSlice.reducer;
