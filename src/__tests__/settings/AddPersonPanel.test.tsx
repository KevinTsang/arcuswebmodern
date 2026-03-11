import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddPersonPanel from '@/components/settings/AddPersonPanel';

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

let mockPlace: Record<string, unknown> | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { place: mockPlace },
    }),
  useAppDispatch: () => mockDispatch,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPlace = {
    'base:address': 'SERV:place:place-1',
    'place:name': 'My Home',
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AddPersonPanel – rendering', () => {
  it('shows heading and description', () => {
    render(<AddPersonPanel />);
    expect(screen.getByText('Invite a Person')).toBeInTheDocument();
    expect(screen.getByText('Send an invitation to join this place.')).toBeInTheDocument();
  });

  it('shows First Name, Last Name, and Email fields', () => {
    render(<AddPersonPanel />);
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows Send Invitation and Cancel buttons', () => {
    render(<AddPersonPanel />);
    expect(screen.getByText('Send Invitation')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables Send Invitation when email is empty', () => {
    render(<AddPersonPanel />);
    expect(screen.getByText('Send Invitation')).toBeDisabled();
  });
});

describe('AddPersonPanel – interactions', () => {
  it('enables Send Invitation when email is entered', () => {
    render(<AddPersonPanel />);
    const emailInput = screen.getByPlaceholderText('person@example.com');
    fireEvent.change(emailInput, { target: { value: 'jane@test.com' } });
    expect(screen.getByText('Send Invitation')).not.toBeDisabled();
  });

  it('calls place:SendInvitation with form data on submit', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AddPersonPanel />);

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Jane' } });
    fireEvent.change(inputs[1], { target: { value: 'Smith' } });
    fireEvent.change(inputs[2], { target: { value: 'jane@test.com' } });

    fireEvent.click(screen.getByText('Send Invitation'));

    await waitFor(() =>
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'place:SendInvitation',
        'SERV:place:place-1',
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' },
      ),
    );
  });

  it('dispatches success notification and closes panel on success', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<AddPersonPanel />);

    const emailInput = screen.getByPlaceholderText('person@example.com');
    fireEvent.change(emailInput, { target: { value: 'jane@test.com' } });
    fireEvent.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Invitation sent!' },
      });
      expect(mockCloseRight).toHaveBeenCalled();
    });
  });

  it('dispatches error notification on failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<AddPersonPanel />);

    const emailInput = screen.getByPlaceholderText('person@example.com');
    fireEvent.change(emailInput, { target: { value: 'jane@test.com' } });
    fireEvent.click(screen.getByText('Send Invitation'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to send invitation.' },
      }),
    );
  });

  it('closes panel on Cancel click', () => {
    render(<AddPersonPanel />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});
