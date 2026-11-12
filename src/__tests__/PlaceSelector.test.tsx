import { screen, fireEvent, waitFor } from '@testing-library/react';
import PlaceSelector, { loadAvailablePlaces } from '@/components/PlaceSelector';
import type { AvailablePlace } from '@/arcus/types';
import { renderSuspended } from './helpers/renderSuspended';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn(() => ({ unwrap: () => Promise.resolve() }));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: any) => any) =>
    sel({ place: { placeId: 'place-1' } }),
}));

jest.mock('@/store/thunks/switchPlaceThunk', () => ({
  switchPlaceThunk: (id: string) => ({ type: 'switchPlace', payload: id }),
}));

jest.mock('@/store/thunks/logoutThunk', () => ({
  logoutThunk: () => ({ type: 'logout' }),
}));

const mockListAvailablePlaces = jest.fn();

jest.mock('@arcus/core/services', () => ({
  SessionService: {
    ListAvailablePlaces: (...args: any[]) => mockListAvailablePlaces(...args),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HOME: AvailablePlace = { placeId: 'place-1', name: 'Current Home', role: 'OWNER' };
const CABIN: AvailablePlace = { placeId: 'place-2', name: 'Cabin', role: 'FULL_ACCESS' };

const renderSelector = (places: AvailablePlace[]) =>
  renderSuspended(<PlaceSelector places={Promise.resolve(places)} />);

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('loadAvailablePlaces', () => {
  it('sorts places alphabetically by name, unnamed first', async () => {
    const zebra = { placeId: 'place-3', name: 'Zebra House', role: 'OWNER' };
    const unnamed = { placeId: 'place-4', role: 'OWNER' };
    mockListAvailablePlaces.mockResolvedValue({ places: [zebra, CABIN, unnamed] });
    await expect(loadAvailablePlaces()).resolves.toEqual([unnamed, CABIN, zebra]);
  });

  it('resolves to an empty list when the response has no places', async () => {
    mockListAvailablePlaces.mockResolvedValue({});
    await expect(loadAvailablePlaces()).resolves.toEqual([]);
  });

  it('resolves to an empty list on fetch error', async () => {
    mockListAvailablePlaces.mockRejectedValueOnce(new Error('Network error'));
    await expect(loadAvailablePlaces()).resolves.toEqual([]);
  });
});

describe('PlaceSelector', () => {
  it('matches snapshot', async () => {
    const { asFragment } = await renderSelector([CABIN, HOME]);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the fallback until the places arrive', async () => {
    await renderSuspended(<PlaceSelector places={new Promise(() => {})} />);
    expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('logout')).not.toBeInTheDocument();
  });

  it('lists places in the order given', async () => {
    await renderSelector([CABIN, HOME]);
    expect(screen.getByTestId('place-option-place-2')).toHaveTextContent('Cabin');
    expect(screen.getByTestId('place-option-place-1')).toHaveTextContent('Current Home');
  });

  it('marks the current place', async () => {
    await renderSelector([CABIN, HOME]);
    expect(screen.getByTestId('place-option-place-1')).toHaveAttribute('data-current', 'true');
    expect(screen.getByTestId('place-option-place-2')).toHaveAttribute('data-current', 'false');
  });

  it('shows "Unnamed Place" when name is missing', async () => {
    await renderSelector([{ placeId: 'place-3', role: 'OWNER' }]);
    expect(screen.getByText('Unnamed Place')).toBeInTheDocument();
  });

  it('shows no places message when list is empty', async () => {
    await renderSelector([]);
    expect(screen.getByText('No places available.')).toBeInTheDocument();
  });

  it('displays a readable role label for each place', async () => {
    await renderSelector([HOME, CABIN]);
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Full Access')).toBeInTheDocument();
    expect(screen.queryByText('FULL_ACCESS')).not.toBeInTheDocument();
  });

  it('switches place and closes the panel when a different place is clicked', async () => {
    await renderSelector([HOME, CABIN]);
    fireEvent.click(screen.getByText('Cabin'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'switchPlace', payload: 'place-2' }),
    );
    await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
  });

  it('keeps the panel open when switching fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDispatch.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('fail')) });
    await renderSelector([HOME, CABIN]);
    fireEvent.click(screen.getByText('Cabin'));
    // The options are disabled while switching and re-enabled once it fails.
    await waitFor(() => expect(screen.getByTestId('place-option-place-2')).toBeEnabled());
    expect(mockCloseRight).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('does not dispatch when clicking the already-active place', async () => {
    await renderSelector([HOME]);
    fireEvent.click(screen.getByText('Current Home'));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches logoutThunk when Log Out is clicked', async () => {
    await renderSelector([]);
    fireEvent.click(screen.getByText('Log Out'));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'logout' }));
  });
});
