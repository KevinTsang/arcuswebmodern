import { render, screen, fireEvent } from '@testing-library/react';
import type { Invitation } from '@arcus/core/services/types';
import PendingInvitationRow from '@/components/settings/PendingInvitationRow';

// ── Helpers ───────────────────────────────────────────────────────────

const invitation: Invitation = {
  code: 'INV-1',
  placeId: 'place-lake',
  placeName: 'Lake House',
  inviteeEmail: 'robin@test.com',
  inviteeFirstName: 'Robin',
  inviteeLastName: 'Park',
  invitorFirstName: 'Me',
  invitorLastName: 'User',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PendingInvitationRow', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PendingInvitationRow invitation={invitation} onCancel={jest.fn()} testId="inv" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the invitee name, email and status', () => {
    render(<PendingInvitationRow invitation={invitation} testId="inv" />);
    expect(screen.getByTestId('inv')).toHaveTextContent('Robin Park');
    expect(screen.getByTestId('inv')).toHaveTextContent('robin@test.com');
    expect(screen.getByTestId('inv')).toHaveTextContent('Invitation Sent');
  });

  it('shows only the email when the invitee has no name', () => {
    render(
      <PendingInvitationRow invitation={{ ...invitation, inviteeFirstName: '', inviteeLastName: '' }} testId="inv" />,
    );
    expect(screen.getAllByText('robin@test.com')).toHaveLength(1);
  });

  it('calls onCancel with the invitation', () => {
    const onCancel = jest.fn();
    render(<PendingInvitationRow invitation={invitation} onCancel={onCancel} testId="inv" />);
    fireEvent.click(screen.getByTestId('inv-cancel'));
    expect(onCancel).toHaveBeenCalledWith(invitation);
  });

  it('has no Cancel button without onCancel', () => {
    render(<PendingInvitationRow invitation={invitation} testId="inv" />);
    expect(screen.queryByTestId('inv-cancel')).not.toBeInTheDocument();
  });
});
