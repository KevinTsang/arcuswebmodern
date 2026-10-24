import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlaceSelector from '@/components/PlaceSelector';

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

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PlaceSelector', () => {
  it('shows loading state initially', () => {
    mockListAvailablePlaces.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PlaceSelector />);
    expect(screen.getByText('Loading places...')).toBeInTheDocument();
  });

  it('displays place names from the name property', async () => {
    mockListAvailablePlaces.mockResolvedValue({
      places: [
        { placeId: 'place-1', name: "Kevin's Home", role: 'OWNER' },
        { placeId: 'place-2', name: 'Shop @ Site 5022', role: 'FULL_ACCESS' },
      ],
    });
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText("Kevin's Home")).toBeInTheDocument();
      expect(screen.getByText('Shop @ Site 5022')).toBeInTheDocument();
    });
  });

  it('sorts places alphabetically by name', async () => {
    mockListAvailablePlaces.mockResolvedValue({
      places: [
        { placeId: 'place-2', name: 'Zebra House', role: 'OWNER' },
        { placeId: 'place-1', name: 'Alpha Home', role: 'FULL_ACCESS' },
      ],
    });
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText('Alpha Home')).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button');
    const placeButtons = buttons.filter(
      (b) => b.textContent?.includes('Alpha Home') || b.textContent?.includes('Zebra House'),
    );
    expect(placeButtons[0].textContent).toContain('Alpha Home');
    expect(placeButtons[1].textContent).toContain('Zebra House');
  });

  it('shows "Unnamed Place" when name is missing', async () => {
    mockListAvailablePlaces.mockResolvedValue({
      places: [
        { placeId: 'place-3', role: 'OWNER' },
      ],
    });
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText('Unnamed Place')).toBeInTheDocument();
    });
  });

  it('shows no places message when list is empty', async () => {
    mockListAvailablePlaces.mockResolvedValue({ places: [] });
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText('No places available.')).toBeInTheDocument();
    });
  });

  it('shows no places message on fetch error', async () => {
    mockListAvailablePlaces.mockRejectedValue(new Error('Network error'));
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText('No places available.')).toBeInTheDocument();
    });
  });

  it('displays a readable role label for each place', async () => {
    mockListAvailablePlaces.mockResolvedValue({
      places: [
        { placeId: 'place-1', name: 'Home', role: 'OWNER' },
        { placeId: 'place-2', name: 'Cabin', role: 'FULL_ACCESS' },
      ],
    });
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Full Access')).toBeInTheDocument();
    });
    expect(screen.queryByText('FULL_ACCESS')).not.toBeInTheDocument();
  });

  it('dispatches switchPlaceThunk when a different place is clicked', async () => {
    mockListAvailablePlaces.mockResolvedValue({
      places: [
        { placeId: 'place-1', name: 'Current Home', role: 'OWNER' },
        { placeId: 'place-2', name: 'Other Home', role: 'FULL_ACCESS' },
      ],
    });
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText('Other Home')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Other Home'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'switchPlace', payload: 'place-2' }),
    );
  });

  it('does not dispatch when clicking the already-active place', async () => {
    mockListAvailablePlaces.mockResolvedValue({
      places: [
        { placeId: 'place-1', name: 'Current Home', role: 'OWNER' },
      ],
    });
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText('Current Home')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Current Home'));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches logoutThunk when Log Out is clicked', async () => {
    mockListAvailablePlaces.mockResolvedValue({ places: [] });
    render(<PlaceSelector />);
    await waitFor(() => {
      expect(screen.getByText('Log Out')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Log Out'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'logout' }),
    );
  });
});
