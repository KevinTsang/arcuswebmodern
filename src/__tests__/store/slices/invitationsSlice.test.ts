import reducer, {
  setInvitations,
  setInvitationsLoading,
  clearInvitations,
  type InvitationsState,
  type Invitation,
} from '@/store/slices/invitationsSlice';

const initial: InvitationsState = {
  invitations: [],
  loading: false,
};

const mockInvitation: Invitation = {
  code: 'abc123',
  placeId: 'place-1',
  placeName: 'Test Home',
  streetAddress1: '123 Main St',
  city: 'Springfield',
  stateProv: 'IL',
  zipCode: '62701',
  inviteeEmail: 'jane@test.com',
  inviteeFirstName: 'Jane',
  inviteeLastName: 'Doe',
  invitorFirstName: 'John',
  invitorLastName: 'Smith',
};

describe('invitationsSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('setInvitations sets the list and clears loading', () => {
    const loadingState: InvitationsState = { invitations: [], loading: true };
    const state = reducer(loadingState, setInvitations([mockInvitation]));
    expect(state.invitations).toHaveLength(1);
    expect(state.invitations[0].code).toBe('abc123');
    expect(state.invitations[0].placeName).toBe('Test Home');
    expect(state.loading).toBe(false);
  });

  it('setInvitations replaces existing invitations', () => {
    const existing: InvitationsState = {
      invitations: [mockInvitation],
      loading: false,
    };
    const newInvitation: Invitation = {
      ...mockInvitation,
      code: 'xyz789',
      placeName: 'Other Home',
    };
    const state = reducer(existing, setInvitations([newInvitation]));
    expect(state.invitations).toHaveLength(1);
    expect(state.invitations[0].code).toBe('xyz789');
  });

  it('setInvitationsLoading sets loading flag', () => {
    const state = reducer(initial, setInvitationsLoading(true));
    expect(state.loading).toBe(true);
  });

  it('clearInvitations resets to empty state', () => {
    const populated: InvitationsState = {
      invitations: [mockInvitation],
      loading: true,
    };
    const state = reducer(populated, clearInvitations());
    expect(state.invitations).toEqual([]);
    expect(state.loading).toBe(false);
  });
});
