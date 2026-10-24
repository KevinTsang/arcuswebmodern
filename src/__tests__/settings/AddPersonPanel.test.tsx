import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Place } from '@arcus/core';
import AddPersonPanel from '@/components/settings/AddPersonPanel';
import type { PlaceData } from '@/store/entityTypes';

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

// The ACTIVE place is "My Home" (place-1). The panel is opened for a different
// place, and must never fall back to the active one.
const activePlace: PlaceData = {
  [Base.ATTR_ADDRESS]: 'SERV:place:place-1',
  [Base.ATTR_ID]: 'place-1',
  [Place.ATTR_NAME]: 'My Home',
};

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { placeId: 'place-1', place: activePlace },
    }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const defaultProps = { placeId: 'place-2', placeName: 'Lake House' };

/** Command → response handler. Tests override entries to control per-command behavior. */
const commandHandlers = new Map<string, () => Promise<unknown>>();

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

beforeEach(() => {
  jest.clearAllMocks();
  commandHandlers.clear();

  commandHandlers.set(Place.CMD_CREATEINVITATION, () =>
    Promise.resolve({ invitation: { code: 'abc', inviteeEmail: 'jane@test.com' } }),
  );

  mockBridgeRequest.mockImplementation((type: string) => {
    const handler = commandHandlers.get(type);
    return handler ? handler() : Promise.resolve({});
  });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AddPersonPanel – rendering', () => {
  it('matches snapshot', () => {
    const { container } = render(<AddPersonPanel {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows heading and names the place being invited to', () => {
    render(<AddPersonPanel {...defaultProps} />);
    expect(screen.getByTestId('invite-panel-title')).toHaveTextContent('Invite a Person');
    expect(screen.getByTestId('invite-panel-place')).toHaveTextContent('Send an invitation to join Lake House.');
  });

  it('shows First Name, Last Name, Email, and Relationship fields', () => {
    render(<AddPersonPanel {...defaultProps} />);
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Relationship')).toBeInTheDocument();
  });

  it('shows Send Invitation and Cancel buttons', () => {
    render(<AddPersonPanel {...defaultProps} />);
    expect(screen.getByText('Send Invitation')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables Send Invitation when email is empty', () => {
    render(<AddPersonPanel {...defaultProps} />);
    expect(screen.getByText('Send Invitation')).toBeDisabled();
  });

  it('shows relationship dropdown with grouped options', () => {
    render(<AddPersonPanel {...defaultProps} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Spouse/Partner')).toBeInTheDocument();
    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('Babysitter (Nanny)')).toBeInTheDocument();
  });
});

describe('AddPersonPanel – relationship', () => {
  it('defaults to OTHER when no relationship selected', async () => {
    render(<AddPersonPanel {...defaultProps} />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Place.CMD_CREATEINVITATION,
        'SERV:place:place-2',
        expect.objectContaining({ relationship: 'OTHER' }),
      );
    });
  });

  it('sends selected relationship tag', async () => {
    render(<AddPersonPanel {...defaultProps} />);
    fillAndSubmit('people_family_spouse');

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Place.CMD_CREATEINVITATION,
        'SERV:place:place-2',
        expect.objectContaining({ relationship: 'people_family_spouse' }),
      );
    });
  });

  it('shows Please Describe field when Other is selected', () => {
    render(<AddPersonPanel {...defaultProps} />);
    expect(screen.queryByPlaceholderText('e.g. Property Manager')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'people_service_other' } });
    expect(screen.getByPlaceholderText('e.g. Property Manager')).toBeInTheDocument();
  });

  it('sends custom description when Other is selected and described', async () => {
    render(<AddPersonPanel {...defaultProps} />);
    fillAndSubmit('people_service_other', 'Property Manager');

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Place.CMD_CREATEINVITATION,
        'SERV:place:place-2',
        expect.objectContaining({ relationship: 'Property Manager' }),
      );
    });
  });
});

describe('AddPersonPanel – interactions', () => {
  it('enables Send Invitation when email is entered', () => {
    render(<AddPersonPanel {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText('person@example.com');
    fireEvent.change(emailInput, { target: { value: 'jane@test.com' } });
    expect(screen.getByText('Send Invitation')).not.toBeDisabled();
  });

  it('sends both invitation calls to the given place, not the active place', async () => {
    render(<AddPersonPanel {...defaultProps} />);
    fillAndSubmit();

    await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledTimes(2));
    for (const [, address] of mockBridgeRequest.mock.calls) {
      expect(address).toBe('SERV:place:place-2');
      expect(address).not.toBe(activePlace[Base.ATTR_ADDRESS]);
    }
  });

  it('calls CreateInvitation then SendInvitation on submit', async () => {
    render(<AddPersonPanel {...defaultProps} />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Place.CMD_CREATEINVITATION,
        'SERV:place:place-2',
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', relationship: 'OTHER' },
      );
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Place.CMD_SENDINVITATION,
        'SERV:place:place-2',
        { invitation: { code: 'abc', inviteeEmail: 'jane@test.com' } },
      );
    });
  });

  it('dispatches success notification and closes panel on success', async () => {
    render(<AddPersonPanel {...defaultProps} />);

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
    commandHandlers.set(Place.CMD_CREATEINVITATION, () =>
      Promise.reject(new Error('fail')),
    );

    render(<AddPersonPanel {...defaultProps} />);

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
    render(<AddPersonPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('calls onSent callback after successful send', async () => {
    const onSent = jest.fn();

    render(<AddPersonPanel {...defaultProps} onSent={onSent} />);
    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'jane@test.com' } });
    fireEvent.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(onSent).toHaveBeenCalled();
    });
  });
});
