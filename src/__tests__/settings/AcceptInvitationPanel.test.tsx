import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AcceptInvitationPanel from '@/components/AcceptInvitationPanel';
import type { Invitation } from '@/store/slices/invitationsSlice';

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
let mockPerson: Record<string, unknown> | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      auth: { person: mockPerson },
      invitations: { invitations: mockInvitations },
    }),
  useAppDispatch: () => mockDispatch,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPerson = { personId: 'person-1' };
  mockInvitations = [mockInvitation];
  // Default: PendingInvitations returns the current mock list
  mockBridgeRequest.mockImplementation((type: string) => {
    if (type === 'person:PendingInvitations') {
      return Promise.resolve({ invitations: mockInvitations });
    }
    return Promise.resolve({});
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
    mockBridgeRequest.mockImplementation((type: string) => {
      if (type === 'person:PendingInvitations') {
        return Promise.resolve({ invitations: mockInvitations });
      }
      if (type === 'person:AcceptInvitation') {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });

    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'person:AcceptInvitation',
        'SERV:person:person-1',
        { code: 'abc123', inviteeEmail: 'jane@test.com' },
      );
    });
  });

  it('shows PIN creation form after accepting', async () => {
    mockBridgeRequest.mockImplementation((type: string) => {
      if (type === 'person:PendingInvitations') {
        return Promise.resolve({ invitations: mockInvitations });
      }
      return Promise.resolve({});
    });

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
    mockBridgeRequest.mockResolvedValue({});
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
    mockBridgeRequest.mockResolvedValue({});
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
    mockBridgeRequest.mockResolvedValue({});
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
        'person:ChangePinV2',
        'SERV:person:person-1',
        { place: 'place-1', pin: '1234' },
      );
    });
  });

  it('dispatches success notification after PIN saved', async () => {
    mockBridgeRequest.mockResolvedValue({});
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
    mockBridgeRequest.mockResolvedValue({});
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
    mockBridgeRequest.mockImplementation((type: string) => {
      if (type === 'person:PendingInvitations') {
        return Promise.resolve({ invitations: [] });
      }
      return Promise.resolve({});
    });

    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Decline'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'person:RejectInvitation',
        'SERV:person:person-1',
        { code: 'abc123', inviteeEmail: 'jane@test.com' },
      );
    });
  });

  it('shows error message on accept failure', async () => {
    mockBridgeRequest.mockImplementation((type: string) => {
      if (type === 'person:PendingInvitations') {
        return Promise.resolve({ invitations: mockInvitations });
      }
      if (type === 'person:AcceptInvitation') {
        return Promise.reject(new Error('failed'));
      }
      return Promise.resolve({});
    });

    render(<AcceptInvitationPanel />);
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText("Hmm... something's wrong. Please try again.")).toBeInTheDocument();
    });
  });
});
