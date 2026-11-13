import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Place } from '@arcus/core';
import type { Invitation } from '@arcus/core/services/types';
import CancelInvitationPanel from '@/components/settings/CancelInvitationPanel';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

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

const defaultProps = { invitation, placeId: 'place-lake', placeName: 'Lake House' };

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CancelInvitationPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CancelInvitationPanel {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('names the invitee and the place', () => {
    render(<CancelInvitationPanel {...defaultProps} />);
    expect(screen.getByTestId('cancel-invitation-message')).toHaveTextContent(
      'You will have to re-invite Robin Park to give them access to Lake House.',
    );
  });

  it('falls back to the email when the invitee has no name', () => {
    render(
      <CancelInvitationPanel
        {...defaultProps}
        invitation={{ ...invitation, inviteeFirstName: '', inviteeLastName: '' }}
      />,
    );
    expect(screen.getByTestId('cancel-invitation-message')).toHaveTextContent('re-invite robin@test.com');
  });

  it('cancels the invitation, notifies, refreshes and closes', async () => {
    const onCancelled = jest.fn();
    render(<CancelInvitationPanel {...defaultProps} onCancelled={onCancelled} />);
    fireEvent.click(screen.getByTestId('cancel-invitation-confirm'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_CANCELINVITATION, 'SERV:place:place-lake', { code: 'INV-1' });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Invitation to Robin Park cancelled.' },
    });
    expect(onCancelled).toHaveBeenCalled();
  });

  it('shows progress while cancelling', async () => {
    let finish: () => void = () => {};
    mockBridgeRequest.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    render(<CancelInvitationPanel {...defaultProps} />);
    fireEvent.click(screen.getByTestId('cancel-invitation-confirm'));
    expect(screen.getByTestId('cancel-invitation-confirm')).toBeDisabled();
    expect(screen.getByTestId('cancel-invitation-confirm')).toHaveTextContent('Cancelling…');
    finish();
    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
  });

  it('reports a failure and stays open', async () => {
    const onCancelled = jest.fn();
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<CancelInvitationPanel {...defaultProps} onCancelled={onCancelled} />);
    fireEvent.click(screen.getByTestId('cancel-invitation-confirm'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to cancel invitation.' },
      }),
    );
    expect(onCancelled).not.toHaveBeenCalled();
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(screen.getByTestId('cancel-invitation-confirm')).not.toBeDisabled();
  });

  it('keeps the invitation when backing out', () => {
    render(<CancelInvitationPanel {...defaultProps} />);
    fireEvent.click(screen.getByTestId('cancel-invitation-back'));
    expect(mockCloseRight).toHaveBeenCalled();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});
