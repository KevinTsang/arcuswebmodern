import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/(authenticated)/settings/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight, closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/slices/authSlice', () => ({
  loginSuccess: (payload: unknown) => ({ type: 'auth/loginSuccess', payload }),
}));

jest.mock('@/store/slices/placeSlice', () => ({
  setPlace: (payload: unknown) => ({ type: 'place/setPlace', payload }),
}));

let mockPerson: Record<string, unknown> | null = null;
let mockAccount: Record<string, unknown> | null = null;
let mockPlace: Record<string, unknown> | null = null;
let mockPeople: Record<string, unknown>[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      auth: { person: mockPerson, account: mockAccount },
      place: { place: mockPlace },
      people: {
        entities: Object.fromEntries(mockPeople.map((p, i) => [`p${i}`, { ...p, id: `p${i}` }])),
        ids: mockPeople.map((_, i) => `p${i}`),
      },
    }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/peopleSlice', () => ({
  selectAllPeople: (state: any) => state.people.ids.map((id: string) => state.people.entities[id]),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPerson = {
    'base:address': 'SERV:person:p1',
    'person:firstName': 'John',
    'person:lastName': 'Doe',
    'person:email': 'john@test.com',
    'person:mobileNumber': '555-0100',
  };
  mockAccount = { 'account:state': 'ACTIVE' };
  mockPlace = {
    'base:address': 'SERV:place:place-1',
    'base:id': 'place-1',
    'place:name': 'My Home',
    'place:streetAddress1': '123 Main St',
    'place:city': 'Springfield',
    'place:stateProv': 'IL',
    'place:zipCode': '62701',
    'place:serviceLevel': 'PREMIUM',
  };
  mockPeople = [];
});

// ── Utility functions ─────────────────────────────────────────────────

async function lookupInvitation() {
  mockBridgeRequest.mockResolvedValueOnce({
    invitorFirstName: 'Alice',
    invitorLastName: 'Johnson',
    placeName: 'Beach House',
  });
  render(<SettingsPage />);
  fireEvent.click(screen.getByText('Invitation Code'));

  const inputs = screen.getAllByRole('textbox');
  fireEvent.change(inputs[0], { target: { value: 'VALIDCODE' } });
  fireEvent.change(inputs[1], { target: { value: 'user@test.com' } });
  fireEvent.click(screen.getByText('Look Up Invitation'));

  await waitFor(() =>
    expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument(),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('SettingsPage – rendering', () => {
  it('shows Settings heading', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows all section tabs', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('People & Places')).toBeInTheDocument();
    expect(screen.getByText('Invitation Code')).toBeInTheDocument();
  });
});

describe('SettingsPage – Profile section', () => {
  it('shows contact information', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
  });

  it('shows password section', () => {
    render(<SettingsPage />);
    // "Password" appears as both the section title and an info row label
    expect(screen.getAllByText('Password').length).toBeGreaterThanOrEqual(1);
  });

  it('shows service plan', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Service Plan')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('shows account state', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows loading when no person', () => {
    mockPerson = null;
    render(<SettingsPage />);
    expect(screen.getByText(/Loading profile/)).toBeInTheDocument();
  });

  it('shows Edit button for contact info', () => {
    render(<SettingsPage />);
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('opens side panel on Edit click', () => {
    render(<SettingsPage />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(mockOpenRight).toHaveBeenCalled();
  });

  it('shows Change button for password', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Change')).toBeInTheDocument();
  });
});

describe('SettingsPage – People & Places section', () => {
  it('shows place info when switched to People & Places', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('People & Places'));
    expect(screen.getByText('My Home')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Springfield, IL, 62701')).toBeInTheDocument();
  });

  it('shows service level in place info', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('People & Places'));
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('shows API Keys link', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('People & Places'));
    expect(screen.getByText('Manage API Keys')).toBeInTheDocument();
  });

  it('shows no people message when empty', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('People & Places'));
    expect(screen.getByText('No people at this place.')).toBeInTheDocument();
  });

  it('lists people when present', () => {
    mockPeople = [
      {
        'base:address': 'SERV:person:p1',
        'person:firstName': 'Jane',
        'person:lastName': 'Smith',
        'person:email': 'jane@test.com',
      },
    ];
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('People & Places'));
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});

describe('SettingsPage – Invitation section', () => {
  it('shows invitation code form when switched to Invitation Code', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Invitation Code'));
    expect(screen.getByText('Enter Invitation Code')).toBeInTheDocument();
    expect(screen.getByText('Look Up Invitation')).toBeInTheDocument();
  });

  it('disables Look Up button when fields are empty', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Invitation Code'));
    expect(screen.getByText('Look Up Invitation')).toBeDisabled();
  });

  it('shows error message when invitation code is invalid', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('not found'));
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Invitation Code'));

    const inputs = screen.getAllByRole('textbox');
    // First input is invitation code, second is email
    fireEvent.change(inputs[0], { target: { value: 'BADCODE' } });
    fireEvent.change(inputs[1], { target: { value: 'user@test.com' } });

    fireEvent.click(screen.getByText('Look Up Invitation'));

    await waitFor(() =>
      expect(screen.getByText(/invitation code not recognized/)).toBeInTheDocument(),
    );
  });

  // ── Acceptance flow ──

  it('shows invitation details after successful lookup', async () => {
    await lookupInvitation();
    expect(screen.getByText(/Beach House/)).toBeInTheDocument();
    expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls AcceptInvitationCreateLogin on accept', async () => {
    mockBridgeRequest.mockResolvedValue({});
    await lookupInvitation();

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() =>
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'invite:AcceptInvitationCreateLogin',
        'SERV:invite:',
        { code: 'VALIDCODE', inviteeEmail: 'user@test.com' },
      ),
    );
  });

  it('dispatches success notification on accept', async () => {
    mockBridgeRequest.mockResolvedValue({});
    await lookupInvitation();

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Invitation accepted!' },
      }),
    );
  });

  it('resets form after successful acceptance', async () => {
    mockBridgeRequest.mockResolvedValue({});
    await lookupInvitation();

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() =>
      expect(screen.getByText('Look Up Invitation')).toBeInTheDocument(),
    );
    // Form fields should be cleared
    const inputs = screen.getAllByRole('textbox');
    expect((inputs[0] as HTMLInputElement).value).toBe('');
    expect((inputs[1] as HTMLInputElement).value).toBe('');
  });

  it('shows error when acceptance fails', async () => {
    // First call succeeds (lookup), second call fails (accept)
    mockBridgeRequest
      .mockResolvedValueOnce({
        invitorFirstName: 'Alice',
        invitorLastName: 'Johnson',
        placeName: 'Beach House',
      })
      .mockRejectedValueOnce(new Error('server error'));

    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Invitation Code'));

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'VALIDCODE' } });
    fireEvent.change(inputs[1], { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByText('Look Up Invitation'));

    await waitFor(() =>
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() =>
      expect(screen.getByText('Failed to accept the invitation. Please try again.')).toBeInTheDocument(),
    );
  });

  it('returns to lookup form when Cancel is clicked after lookup', async () => {
    await lookupInvitation();

    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Look Up Invitation')).toBeInTheDocument();
    expect(screen.queryByText('Accept Invitation')).not.toBeInTheDocument();
  });
});

describe('SettingsPage – section navigation', () => {
  it('switches between sections', () => {
    render(<SettingsPage />);

    // Start on Profile
    expect(screen.getByText('Contact Information')).toBeInTheDocument();

    // Switch to People & Places
    fireEvent.click(screen.getByText('People & Places'));
    expect(screen.queryByText('Contact Information')).not.toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();

    // Switch to Invitation Code
    fireEvent.click(screen.getByText('Invitation Code'));
    expect(screen.getByText('Enter Invitation Code')).toBeInTheDocument();

    // Switch back to Profile
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });
});
