import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { Base, Account, Place } from '@arcus/core';
import { AddPlacePanel } from '@/components/settings/AddPlacePanel';
import type { PlaceData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockBridgeRequest = jest.fn();
const mockSwitchUnwrap = jest.fn();
const mockDispatch = jest.fn((action: { type: string }) =>
  action.type === 'place/switchPlace' ? { unwrap: mockSwitchUnwrap } : action,
);

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

jest.mock('@/store/thunks/switchPlaceThunk', () => ({
  switchPlaceThunk: (placeId: string) => ({ type: 'place/switchPlace', payload: placeId }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const OWN_ACCOUNT_ID = 'acct-own';

const newPlace: PlaceData = {
  [Base.ATTR_ADDRESS]: 'SERV:place:place-new',
  [Base.ATTR_ID]: 'place-new',
  [Place.ATTR_NAME]: 'Beach House',
  [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM_FREE,
};

const mockOnSaved = jest.fn();

function renderPanel() {
  return render(<AddPlacePanel accountId={OWN_ACCOUNT_ID} onSaved={mockOnSaved} />);
}

function createPlace(name = 'Beach House') {
  fireEvent.change(screen.getByPlaceholderText('e.g. Lake House'), { target: { value: name } });
  fireEvent.click(screen.getByTestId('place-create'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({ place: newPlace });
  mockSwitchUnwrap.mockResolvedValue('place-new');
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AddPlacePanel – rendering', () => {
  it('matches snapshot', () => {
    const { container } = renderPanel();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows heading', () => {
    renderPanel();
    expect(screen.getByTestId('add-place-panel-title')).toHaveTextContent('Add a Place');
  });

  it('shows all address fields', () => {
    renderPanel();
    expect(screen.getByText('Place Name')).toBeInTheDocument();
    expect(screen.getByText('Street Address')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('State')).toBeInTheDocument();
    expect(screen.getByText('ZIP Code')).toBeInTheDocument();
  });

  it('shows Create Place and Cancel buttons', () => {
    renderPanel();
    expect(screen.getByText('Create Place')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables Create Place when name is empty', () => {
    renderPanel();
    expect(screen.getByTestId('place-create')).toBeDisabled();
  });

  it('keeps Create Place disabled for a whitespace-only name', () => {
    renderPanel();
    fireEvent.change(screen.getByPlaceholderText('e.g. Lake House'), { target: { value: '   ' } });
    expect(screen.getByTestId('place-create')).toBeDisabled();
  });
});

describe('AddPlacePanel – creating a place', () => {
  it('enables Create Place when name is entered', () => {
    renderPanel();
    fireEvent.change(screen.getByPlaceholderText('e.g. Lake House'), { target: { value: 'Beach House' } });
    expect(screen.getByTestId('place-create')).not.toBeDisabled();
  });

  it('calls account:AddPlace on the given account with the form data', async () => {
    renderPanel();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Beach House' } });
    fireEvent.change(inputs[1], { target: { value: '456 Ocean Ave' } });
    fireEvent.change(inputs[2], { target: { value: 'Malibu' } });
    fireEvent.change(inputs[3], { target: { value: 'CA' } });
    fireEvent.change(inputs[4], { target: { value: '90265' } });

    fireEvent.click(screen.getByTestId('place-create'));

    await waitFor(() =>
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Account.CMD_ADDPLACE,
        `SERV:account:${OWN_ACCOUNT_ID}`,
        {
          place: {
            [Place.ATTR_NAME]: 'Beach House',
            [Place.ATTR_STREETADDRESS1]: '456 Ocean Ave',
            [Place.ATTR_CITY]: 'Malibu',
            [Place.ATTR_STATEPROV]: 'CA',
            [Place.ATTR_ZIPCODE]: '90265',
          },
          serviceLevel: Place.SERVICELEVEL_BASIC,
        },
      ),
    );
  });

  it('notifies, refreshes the places list and offers to switch on success', async () => {
    renderPanel();
    createPlace();

    await waitFor(() => expect(screen.getByTestId('add-place-added')).toHaveTextContent(
      'Beach House has been added to your account.',
    ));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Place created!' },
    });
    expect(mockOnSaved).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('add-place-switch')).toHaveTextContent('Switch to Beach House');
    expect(mockCloseRight).not.toHaveBeenCalled();
  });

  it('does not change the active place when a place is added', async () => {
    renderPanel();
    createPlace();

    await waitFor(() => expect(screen.getByTestId('add-place-added')).toBeInTheDocument());
    // Only the success toast is dispatched: no setPlace / switchPlace.
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.calls[0][0].type).toBe('ui/addNotification');
  });

  it('matches snapshot after a place is added', async () => {
    const { container } = renderPanel();
    createPlace();

    await waitFor(() => expect(screen.getByTestId('add-place-added')).toBeInTheDocument());
    expect(container.firstChild).toMatchSnapshot();
  });

  it('falls back to the entered name when the response has none', async () => {
    const { [Place.ATTR_NAME]: _, ...unnamed } = newPlace;
    mockBridgeRequest.mockResolvedValue({ place: unnamed });
    renderPanel();
    createPlace('  Cabin  ');

    await waitFor(() => expect(screen.getByTestId('add-place-added')).toHaveTextContent(
      'Cabin has been added to your account.',
    ));
  });

  it('reports success without a Switch button when the reply has no place', async () => {
    // The platform created the place; a malformed reply must not read as a
    // failure, or a retry would create a second place.
    mockBridgeRequest.mockResolvedValue({});
    renderPanel();
    createPlace('Cabin');

    await waitFor(() => expect(screen.getByTestId('add-place-added')).toHaveTextContent(
      'Cabin has been added to your account.',
    ));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Place created!' },
    });
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ type: 'error' }),
    }));
    expect(mockOnSaved).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('add-place-switch')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-place-done')).toBeInTheDocument();
  });

  it('still reports success when refreshing the places list throws', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onSaved = jest.fn(() => {
      throw new Error('refresh failed');
    });
    render(<AddPlacePanel accountId={OWN_ACCOUNT_ID} onSaved={onSaved} />);
    createPlace();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.getByTestId('add-place-added')).toBeInTheDocument();
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to create place.' },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('shows an error and keeps the form on failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    renderPanel();
    createPlace();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to create place.' },
      }),
    );
    expect(mockOnSaved).not.toHaveBeenCalled();
    expect(screen.queryByTestId('add-place-added')).not.toBeInTheDocument();
    expect(screen.getByTestId('place-create')).not.toBeDisabled();
  });

  it('closes panel on Cancel click', () => {
    renderPanel();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});

describe('AddPlacePanel – after the place is added', () => {
  async function renderAdded() {
    renderPanel();
    createPlace();
    await waitFor(() => expect(screen.getByTestId('add-place-switch')).toBeInTheDocument());
    mockDispatch.mockClear();
  }

  it('switches to the new place with switchPlaceThunk and closes the panel', async () => {
    await renderAdded();
    fireEvent.click(screen.getByTestId('add-place-switch'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'place/switchPlace', payload: 'place-new' });
    expect(mockSwitchUnwrap).toHaveBeenCalled();
  });

  it('shows an error and stays open when switching fails', async () => {
    mockSwitchUnwrap.mockRejectedValue(new Error('fail'));
    await renderAdded();
    fireEvent.click(screen.getByTestId('add-place-switch'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to switch to the new place.' },
      }),
    );
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(screen.getByTestId('add-place-switch')).not.toBeDisabled();
  });

  it('does not close another panel if this one was closed during the switch', async () => {
    renderPanel();
    createPlace();
    await waitFor(() => expect(screen.getByTestId('add-place-switch')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('add-place-switch'));
    expect(screen.getByTestId('add-place-switch')).toHaveTextContent('Switching…');
    // The user closes this panel (and may open another) before the switch ends
    cleanup();
    await act(async () => {});

    expect(mockSwitchUnwrap).toHaveBeenCalled();
    expect(mockCloseRight).not.toHaveBeenCalled();
  });

  it('closes without switching on Done', async () => {
    await renderAdded();
    fireEvent.click(screen.getByTestId('add-place-done'));

    expect(mockCloseRight).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
