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

function fillAndSubmit(relationship?: string, pleaseDescribe?: string) {
  const inputs = screen.getAllByRole('textbox');
  fireEvent.change(inputs[0], { target: { value: 'Jane' } });
  fireEvent.change(inputs[1], { target: { value: 'Smith' } });
  fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'jane@test.com' } });

  if (relationship) {
    fireEvent.change(screen.getByRole('combobox'), { target: { value: relationship } });
  }
  if (pleaseDescribe) {
    fireEvent.change(screen.getByPlaceholderText('e.g. Property Manager'), { target: { value: pleaseDescribe } });
  }

  fireEvent.click(screen.getByText('Send Invitation'));
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('AddPersonPanel – rendering', () => {
  it('shows heading and description', () => {
    render(<AddPersonPanel />);
    expect(screen.getByText('Invite a Person')).toBeInTheDocument();
    expect(screen.getByText('Send an invitation to join this place.')).toBeInTheDocument();
  });

  it('shows First Name, Last Name, Email, and Relationship fields', () => {
    render(<AddPersonPanel />);
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Relationship')).toBeInTheDocument();
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

  it('shows relationship dropdown with grouped options', () => {
    render(<AddPersonPanel />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Spouse/Partner')).toBeInTheDocument();
    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('Babysitter (Nanny)')).toBeInTheDocument();
  });
});

describe('AddPersonPanel – relationship', () => {
  beforeEach(() => {
    mockBridgeRequest.mockImplementation((type: string) => {
      if (type === 'place:CreateInvitation') {
        return Promise.resolve({ invitation: { code: 'abc' } });
      }
      return Promise.resolve({});
    });
  });

  it('defaults to OTHER when no relationship selected', async () => {
    render(<AddPersonPanel />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'place:CreateInvitation',
        'SERV:place:place-1',
        expect.objectContaining({ relationship: 'OTHER' }),
      );
    });
  });

  it('sends selected relationship tag', async () => {
    render(<AddPersonPanel />);
    fillAndSubmit('people_family_spouse');

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'place:CreateInvitation',
        'SERV:place:place-1',
        expect.objectContaining({ relationship: 'people_family_spouse' }),
      );
    });
  });

  it('shows Please Describe field when Other is selected', () => {
    render(<AddPersonPanel />);
    expect(screen.queryByPlaceholderText('e.g. Property Manager')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'people_service_other' } });
    expect(screen.getByPlaceholderText('e.g. Property Manager')).toBeInTheDocument();
  });

  it('sends custom description when Other is selected and described', async () => {
    render(<AddPersonPanel />);
    fillAndSubmit('people_service_other', 'Property Manager');

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'place:CreateInvitation',
        'SERV:place:place-1',
        expect.objectContaining({ relationship: 'Property Manager' }),
      );
    });
  });
});

describe('AddPersonPanel – interactions', () => {
  it('enables Send Invitation when email is entered', () => {
    render(<AddPersonPanel />);
    const emailInput = screen.getByPlaceholderText('person@example.com');
    fireEvent.change(emailInput, { target: { value: 'jane@test.com' } });
    expect(screen.getByText('Send Invitation')).not.toBeDisabled();
  });

  it('calls CreateInvitation then SendInvitation on submit', async () => {
    const fakeInvitation = { code: 'abc', inviteeEmail: 'jane@test.com' };
    mockBridgeRequest.mockImplementation((type: string) => {
      if (type === 'place:CreateInvitation') {
        return Promise.resolve({ invitation: fakeInvitation });
      }
      return Promise.resolve({});
    });

    render(<AddPersonPanel />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'place:CreateInvitation',
        'SERV:place:place-1',
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', relationship: 'OTHER' },
      );
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'place:SendInvitation',
        'SERV:place:place-1',
        { invitation: fakeInvitation },
      );
    });
  });

  it('dispatches success notification and closes panel on success', async () => {
    mockBridgeRequest.mockImplementation((type: string) => {
      if (type === 'place:CreateInvitation') {
        return Promise.resolve({ invitation: { code: 'x' } });
      }
      return Promise.resolve({});
    });
    render(<AddPersonPanel />);

    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'jane@test.com' } });
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

    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'jane@test.com' } });
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

  it('calls onSent callback after successful send', async () => {
    const onSent = jest.fn();
    mockBridgeRequest.mockImplementation((type: string) => {
      if (type === 'place:CreateInvitation') {
        return Promise.resolve({ invitation: { code: 'x' } });
      }
      return Promise.resolve({});
    });

    render(<AddPersonPanel onSent={onSent} />);
    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'jane@test.com' } });
    fireEvent.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(onSent).toHaveBeenCalled();
    });
  });
});
