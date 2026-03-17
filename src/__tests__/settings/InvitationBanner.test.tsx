import { render, screen, fireEvent } from '@testing-library/react';
import InvitationBanner from '@/components/InvitationBanner';
import type { Invitation } from '@/store/slices/invitationsSlice';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

let mockInvitations: Invitation[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      invitations: { invitations: mockInvitations },
    }),
  useAppDispatch: () => jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockInvitations = [];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('InvitationBanner', () => {
  it('renders nothing when there are no invitations', () => {
    const { container } = render(<InvitationBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders banner with singular text for 1 invitation', () => {
    mockInvitations = [
      {
        code: 'abc',
        placeId: 'p1',
        placeName: 'Home',
        inviteeEmail: 'a@b.com',
        inviteeFirstName: 'A',
        inviteeLastName: 'B',
        invitorFirstName: 'C',
        invitorLastName: 'D',
      },
    ];
    render(<InvitationBanner />);
    expect(screen.getByText(/1 pending invitation\b/)).toBeInTheDocument();
  });

  it('renders banner with plural text for multiple invitations', () => {
    mockInvitations = [
      {
        code: 'abc',
        placeId: 'p1',
        placeName: 'Home',
        inviteeEmail: 'a@b.com',
        inviteeFirstName: 'A',
        inviteeLastName: 'B',
        invitorFirstName: 'C',
        invitorLastName: 'D',
      },
      {
        code: 'def',
        placeId: 'p2',
        placeName: 'Office',
        inviteeEmail: 'a@b.com',
        inviteeFirstName: 'A',
        inviteeLastName: 'B',
        invitorFirstName: 'E',
        invitorLastName: 'F',
      },
    ];
    render(<InvitationBanner />);
    expect(screen.getByText(/2 pending invitations/)).toBeInTheDocument();
  });

  it('opens AcceptInvitationPanel in side panel on click', () => {
    mockInvitations = [
      {
        code: 'abc',
        placeId: 'p1',
        placeName: 'Home',
        inviteeEmail: 'a@b.com',
        inviteeFirstName: 'A',
        inviteeLastName: 'B',
        invitorFirstName: 'C',
        invitorLastName: 'D',
      },
    ];
    render(<InvitationBanner />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockOpenRight).toHaveBeenCalledTimes(1);
  });
});
