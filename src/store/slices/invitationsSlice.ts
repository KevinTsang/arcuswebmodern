import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Invitation {
  code: string;
  placeId: string;
  placeName: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  stateProv?: string;
  zipCode?: string;
  inviteeEmail: string;
  inviteeFirstName: string;
  inviteeLastName: string;
  invitorFirstName: string;
  invitorLastName: string;
  invitationText?: string;
  personalizedGreeting?: string;
  [key: string]: unknown;
}

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
