import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlaceAddedView } from '@/components/settings/PlaceAddedView';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockSwitchUnwrap = jest.fn();
const mockDispatch = jest.fn((action: { type: string }) =>
  action.type === 'place/switchPlace' ? { unwrap: mockSwitchUnwrap } : action,
);

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

const defaultProps = { placeId: 'place-new', name: 'Beach House' };

const SWITCH_ERROR = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Failed to switch to the new place.' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSwitchUnwrap.mockResolvedValue('place-new');
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PlaceAddedView – rendering', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PlaceAddedView {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot without a place id', () => {
    const { asFragment } = render(<PlaceAddedView name="Cabin" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('confirms the place was added and offers to switch to it', () => {
    render(<PlaceAddedView {...defaultProps} />);
    expect(screen.getByTestId('add-place-added')).toHaveTextContent('Beach House has been added to your account.');
    expect(screen.getByTestId('add-place-switch')).toHaveTextContent('Switch to Beach House');
    expect(screen.getByTestId('add-place-done')).toBeEnabled();
  });

  it('offers only Done when the place id is missing', () => {
    render(<PlaceAddedView name="Cabin" />);
    expect(screen.getByTestId('add-place-added')).toHaveTextContent('Cabin has been added to your account.');
    expect(screen.queryByTestId('add-place-switch')).not.toBeInTheDocument();
    expect(screen.queryByText(/Switch to it now/)).not.toBeInTheDocument();
    expect(screen.getByTestId('add-place-done')).toBeInTheDocument();
  });
});

describe('PlaceAddedView – switching', () => {
  it('switches to the new place with switchPlaceThunk and closes the panel', async () => {
    render(<PlaceAddedView {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-place-switch'));

    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'place/switchPlace', payload: 'place-new' });
    expect(mockSwitchUnwrap).toHaveBeenCalled();
  });

  it('disables both buttons while the switch runs', async () => {
    mockSwitchUnwrap.mockReturnValueOnce(new Promise(() => {}));
    render(<PlaceAddedView {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-place-switch'));

    await waitFor(() => expect(screen.getByTestId('add-place-switch')).toBeDisabled());
    expect(screen.getByTestId('add-place-switch')).toHaveTextContent('Switching…');
    expect(screen.getByTestId('add-place-done')).toBeDisabled();
  });

  it('shows an error and stays open when switching fails', async () => {
    mockSwitchUnwrap.mockRejectedValueOnce(new Error('fail'));
    render(<PlaceAddedView {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-place-switch'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(SWITCH_ERROR));
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(screen.getByTestId('add-place-switch')).toBeEnabled();
  });

  it('does not close another panel if this one was closed during the switch', async () => {
    render(<PlaceAddedView {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-place-switch'));
    expect(screen.getByTestId('add-place-switch')).toHaveTextContent('Switching…');

    // The user closes this panel (and may open another) before the switch ends
    cleanup();
    // The view is unmounted, so no act: wait for the switch itself to finish.
    await expect(mockSwitchUnwrap.mock.results[0].value).resolves.toBe('place-new');

    expect(mockCloseRight).not.toHaveBeenCalled();
  });
});

describe('PlaceAddedView – Done', () => {
  it('closes without switching', () => {
    render(<PlaceAddedView {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-place-done'));

    expect(mockCloseRight).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
