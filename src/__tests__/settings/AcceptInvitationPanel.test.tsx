import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Person } from '@arcus/core';
import AcceptInvitationPanel from '@/components/AcceptInvitationPanel';
import type { Invitation } from '@/store/slices/invitationsSlice';
import type { PersonEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: {
    request: (...args: any[]) => mockBridgeRequest(...args),
    restfulRequest: (...args: any[]) => mockBridgeRequest(...args),
  },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/slices/invitationsSlice', () => ({
  setInvitations: (payload: unknown) => ({ type: 'invitations/setInvitations', payload }),
}));

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

let mockInvitations: Invitation[] = [];
let mockPerson: PersonEntity | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      auth: { person: mockPerson },
      invitations: { invitations: mockInvitations },
    }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

/** Command → response handler. Tests override entries to control per-command behavior. */
const commandHandlers = new Map<string, () => Promise<unknown>>();

beforeEach(() => {
  jest.clearAllMocks();
  commandHandlers.clear();
  mockPerson = {
    id: 'SERV:person:person-1',
    [Base.ATTR_ADDRESS]: 'SERV:person:person-1',
    personId: 'person-1',
  };
  mockInvitations = [mockInvitation];

  commandHandlers.set(Person.CMD_PENDINGINVITATIONS, () =>
    Promise.resolve({ invitations: mockInvitations }),
  );

  mockBridgeRequest.mockImplementation((type: string) => {
    const handler = commandHandlers.get(type);
    return handler ? handler() : Promise.resolve({});
  });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AcceptInvitationPanel – rendering', () => {
  it('shows the Invitations heading', () => {
    render(<AcceptInvitationPanel />);
    expect(screen.getByText('Invitations')).toBeInTheDocument();
  });

  it('displays invitation place name and invitor', () => {
    render(<AcceptInvitationPanel />);
    expect(screen.getByText('Test Home')).toBeInTheDocument();
    expect(screen.getByText(/Invited by John Smith/)).toBeInTheDocument();
  });

  it('displays address details', () => {
    render(<AcceptInvitationPanel />);
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    expect(screen.getByText(/Springfield/)).toBeInTheDocument();
  });

  it('shows Accept and Decline buttons', () => {
    render(<AcceptInvitationPanel />);
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('shows empty state when no invitations', () => {
    mockInvitations = [];
    render(<AcceptInvitationPanel />);
    expect(screen.getByText('You have no pending invitations.')).toBeInTheDocument();
  });
});

describe('AcceptInvitationPanel – accept flow', () => {
  it('calls person:AcceptInvitation with code and email on Accept', async () => {
    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Person.CMD_ACCEPTINVITATION,
        'SERV:person:person-1',
        { code: 'abc123', inviteeEmail: 'jane@test.com' },
      );
    });
  });

  it('shows PIN creation form after accepting', async () => {
    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText('Create a PIN Code')).toBeInTheDocument();
    });
    expect(screen.getAllByPlaceholderText('4-8 digits')).toHaveLength(2);
    expect(screen.getByText('Save PIN')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('validates PIN is 4-8 digits', async () => {
    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText('Create a PIN Code')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save PIN'));

    await waitFor(() => {
      expect(screen.getByText('PIN must be 4-8 digits.')).toBeInTheDocument();
    });
  });

  it('validates PIN codes match', async () => {
    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText('Create a PIN Code')).toBeInTheDocument();
    });

    const inputs = screen.getAllByPlaceholderText('4-8 digits');
    fireEvent.change(inputs[0], { target: { value: '1234' } });
    fireEvent.change(inputs[1], { target: { value: '5678' } });
    fireEvent.click(screen.getByText('Save PIN'));

    await waitFor(() => {
      expect(screen.getByText('PIN codes do not match.')).toBeInTheDocument();
    });
  });

  it('calls person:ChangePinV2 with matching PIN', async () => {
    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText('Create a PIN Code')).toBeInTheDocument();
    });

    const inputs = screen.getAllByPlaceholderText('4-8 digits');
    fireEvent.change(inputs[0], { target: { value: '1234' } });
    fireEvent.change(inputs[1], { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Save PIN'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Person.CMD_CHANGEPINV2,
        'SERV:person:person-1',
        { place: 'place-1', pin: '1234' },
      );
    });
  });

  it('dispatches success notification after PIN saved', async () => {
    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText('Create a PIN Code')).toBeInTheDocument();
    });

    const inputs = screen.getAllByPlaceholderText('4-8 digits');
    fireEvent.change(inputs[0], { target: { value: '1234' } });
    fireEvent.change(inputs[1], { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Save PIN'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'You now have access to Test Home!' },
      });
    });
  });

  it('skips PIN and shows success notification', async () => {
    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText('Create a PIN Code')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'You now have access to Test Home!' },
      });
    });
  });
});

describe('AcceptInvitationPanel – decline flow', () => {
  it('calls person:RejectInvitation on Decline', async () => {
    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Decline'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Person.CMD_REJECTINVITATION,
        'SERV:person:person-1',
        { code: 'abc123', inviteeEmail: 'jane@test.com' },
      );
    });
  });

  it('shows error message on accept failure', async () => {
    commandHandlers.set(Person.CMD_ACCEPTINVITATION, () =>
      Promise.reject(new Error('failed')),
    );

    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText("Hmm... something's wrong. Please try again.")).toBeInTheDocument();
    });
  });
});
