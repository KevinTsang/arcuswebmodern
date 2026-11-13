import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Account, Person } from '@arcus/core';
import DeleteAccountPanel from '@/components/settings/DeleteAccountPanel';
import type { SessionPlace } from '@/arcus/types';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
const LOGOUT = { type: 'auth/logout-thunk' };
let mockPerson: { personId: string; places: SessionPlace[] } | null = null;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/thunks/logoutThunk', () => ({
  logoutThunk: () => LOGOUT,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ auth: { person: mockPerson } }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const OWNED: SessionPlace = { placeId: 'place-1', placeName: 'Home', accountId: 'acct-1', role: 'OWNER' };
const GUEST: SessionPlace = { placeId: 'place-2', placeName: 'Lake', accountId: 'acct-2', role: 'FULL_ACCESS' };

function confirmDelete(word = 'delete') {
  fireEvent.change(screen.getByLabelText('Type DELETE to continue'), { target: { value: word } });
  fireEvent.click(screen.getByTestId('delete-account-submit'));
  fireEvent.click(screen.getByTestId('delete-account-yes'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPerson = { personId: 'p1', places: [GUEST, OWNED] };
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeleteAccountPanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<DeleteAccountPanel />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('warns an owner that the whole account goes', () => {
      render(<DeleteAccountPanel />);
      expect(screen.getByTestId('delete-account-warning')).toHaveTextContent('billing plans will be cancelled');
    });

    it('warns anyone else that only their login goes', () => {
      mockPerson = { personId: 'p1', places: [GUEST] };
      render(<DeleteAccountPanel />);
      expect(screen.getByTestId('delete-account-warning')).toHaveTextContent('no longer be able to sign in');
    });

    it('asks to sign in again without a session', () => {
      mockPerson = null;
      render(<DeleteAccountPanel />);
      expect(screen.getByTestId('delete-account-signed-out')).toBeInTheDocument();
    });
  });

  describe('confirmation', () => {
    it('enables Continue only once DELETE is typed', () => {
      render(<DeleteAccountPanel />);
      const submit = screen.getByTestId('delete-account-submit');
      expect(submit).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Type DELETE to continue'), { target: { value: 'DELET' } });
      expect(submit).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Type DELETE to continue'), { target: { value: ' Delete ' } });
      expect(submit).not.toBeDisabled();
    });

    it('asks once more before deleting', () => {
      render(<DeleteAccountPanel />);
      fireEvent.change(screen.getByLabelText('Type DELETE to continue'), { target: { value: 'DELETE' } });
      fireEvent.click(screen.getByTestId('delete-account-submit'));
      expect(screen.getByTestId('delete-account-confirm')).toHaveTextContent('cannot be reversed');
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('closes on Cancel without deleting', () => {
      render(<DeleteAccountPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockCloseRight).toHaveBeenCalled();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('deleting', () => {
    it('deletes the owned account with its login, then signs out', async () => {
      render(<DeleteAccountPanel />);
      confirmDelete();

      await waitFor(() =>
        expect(mockBridgeRequest).toHaveBeenCalledWith(Account.CMD_DELETE, 'SERV:account:acct-1', { deleteOwnerLogin: true }));
      expect(mockCloseRight).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Your account has been deleted.' },
      });
      expect(mockDispatch).toHaveBeenCalledWith(LOGOUT);
    });

    it('deletes only the login of a person who owns no account', async () => {
      mockPerson = { personId: 'p1', places: [GUEST] };
      render(<DeleteAccountPanel />);
      confirmDelete();

      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(Person.CMD_DELETELOGIN, 'SERV:person:p1', {}));
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(LOGOUT);
    });

    it('shows an error and stays signed in when deletion fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<DeleteAccountPanel />);
      confirmDelete();

      expect(await screen.findByTestId('delete-account-error')).toHaveTextContent('Please try again later');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to delete account.' },
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(LOGOUT);
      expect(mockCloseRight).not.toHaveBeenCalled();
      expect(screen.getByTestId('delete-account-yes')).not.toBeDisabled();
    });
  });
});
