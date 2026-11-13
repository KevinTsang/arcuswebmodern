import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Person, Place } from '@arcus/core';
import PartialAccessForm from '@/components/settings/PartialAccessForm';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
const mockRestfulRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: {
    request: (...args: any[]) => mockBridgeRequest(...args),
    restfulRequest: (...args: any[]) => mockRestfulRequest(...args),
  },
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

const defaultProps = { placeId: 'place-lake', placeName: 'Lake House' };

function type(field: string, value: string) {
  fireEvent.change(screen.getByTestId(`field-${field}`), { target: { value } });
}

const notification = (type: string, message: string) => ({ type: 'ui/addNotification', payload: { type, message } });

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({ newPerson: 'SERV:person:new-1' });
  mockRestfulRequest.mockResolvedValue({ success: true });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PartialAccessForm – rendering', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PartialAccessForm {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('requires a first name before adding', () => {
    render(<PartialAccessForm {...defaultProps} />);
    expect(screen.getByTestId('partial-add')).toBeDisabled();
    type('first-name', '  ');
    expect(screen.getByTestId('partial-add')).toBeDisabled();
    type('first-name', 'Kid');
    expect(screen.getByTestId('partial-add')).not.toBeDisabled();
  });
});

describe('PartialAccessForm – adding', () => {
  it('adds the person to this place and sets their PIN', async () => {
    const onAdded = jest.fn();
    render(<PartialAccessForm {...defaultProps} onAdded={onAdded} />);
    type('first-name', ' Kid ');
    type('last-name', 'Rivera');
    type('email-optional', 'kid@test.com');
    type('phone-number-optional', '555 123 4567');
    type('pin-code', '2468');
    type('verify-pin-code', '2468');
    fireEvent.click(screen.getByTestId('partial-add'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_ADDPERSON, 'SERV:place:place-lake', {
      person: {
        [Person.ATTR_FIRSTNAME]: 'Kid',
        [Person.ATTR_LASTNAME]: 'Rivera',
        [Person.ATTR_EMAIL]: 'kid@test.com',
        [Person.ATTR_MOBILENUMBER]: '(555) 123-4567',
      },
    });
    expect(mockRestfulRequest).toHaveBeenCalledWith(Person.CMD_CHANGEPINV2, 'SERV:person:new-1', {
      place: 'place-lake',
      pin: '2468',
    });
    expect(onAdded).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(notification('success', 'Kid Rivera has been added to Lake House.'));
  });

  it('adds a person with only a name and no PIN', async () => {
    render(<PartialAccessForm {...defaultProps} />);
    type('first-name', 'Kid');
    fireEvent.click(screen.getByTestId('partial-add'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_ADDPERSON, 'SERV:place:place-lake', {
      person: { [Person.ATTR_FIRSTNAME]: 'Kid', [Person.ATTR_LASTNAME]: '' },
    });
    expect(mockRestfulRequest).not.toHaveBeenCalled();
  });

  it('shows progress while adding', async () => {
    let finish: (v: { newPerson: string }) => void = () => {};
    mockBridgeRequest.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    render(<PartialAccessForm {...defaultProps} />);
    type('first-name', 'Kid');
    fireEvent.click(screen.getByTestId('partial-add'));
    expect(screen.getByTestId('partial-add')).toHaveTextContent('Adding…');
    expect(screen.getByTestId('partial-add')).toBeDisabled();
    await act(async () => finish({ newPerson: 'SERV:person:new-1' }));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});

describe('PartialAccessForm – validation', () => {
  it.each([
    ['email-optional', 'not-an-email', 'Enter a valid email address.'],
    ['phone-number-optional', '12345', 'Enter a valid 10-digit phone number.'],
    ['pin-code', '12', 'PIN must be 4 digits.'],
  ])('rejects an invalid %s', (field, input, message) => {
    render(<PartialAccessForm {...defaultProps} />);
    type('first-name', 'Kid');
    type(field, input);
    fireEvent.click(screen.getByTestId('partial-add'));
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('rejects PIN codes that do not match', () => {
    render(<PartialAccessForm {...defaultProps} />);
    type('first-name', 'Kid');
    type('pin-code', '1234');
    type('verify-pin-code', '4321');
    fireEvent.click(screen.getByTestId('partial-add'));
    expect(screen.getByTestId('field-verify-pin-code-error')).toHaveTextContent('PIN codes do not match.');
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('rejects a verify PIN without a PIN', () => {
    render(<PartialAccessForm {...defaultProps} />);
    type('first-name', 'Kid');
    type('verify-pin-code', '1234');
    fireEvent.click(screen.getByTestId('partial-add'));
    expect(screen.getByTestId('field-verify-pin-code-error')).toBeInTheDocument();
  });
});

describe('PartialAccessForm – failures', () => {
  it('reports a failed add without refreshing or closing', async () => {
    const onAdded = jest.fn();
    mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
    render(<PartialAccessForm {...defaultProps} onAdded={onAdded} />);
    type('first-name', 'Kid');
    fireEvent.click(screen.getByTestId('partial-add'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(notification('error', 'Failed to add person.')));
    expect(onAdded).not.toHaveBeenCalled();
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(screen.getByTestId('partial-add')).not.toBeDisabled();
  });

  it('still refreshes when the person is added but the PIN is rejected', async () => {
    const onAdded = jest.fn();
    mockRestfulRequest.mockRejectedValueOnce(new Error('pin in use'));
    render(<PartialAccessForm {...defaultProps} onAdded={onAdded} />);
    type('first-name', 'Kid');
    type('pin-code', '1234');
    type('verify-pin-code', '1234');
    fireEvent.click(screen.getByTestId('partial-add'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(onAdded).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ type: 'error', message: expect.stringContaining("PIN couldn't be set") }),
    }));
  });

  it("doesn't close or toast after being replaced", async () => {
    let finish: (v: { newPerson: string }) => void = () => {};
    mockBridgeRequest.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const onAdded = jest.fn();
    const { unmount } = render(<PartialAccessForm {...defaultProps} onAdded={onAdded} />);
    type('first-name', 'Kid');
    fireEvent.click(screen.getByTestId('partial-add'));
    unmount();
    await act(async () => finish({ newPerson: 'SERV:person:new-1' }));

    expect(onAdded).toHaveBeenCalled();
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
