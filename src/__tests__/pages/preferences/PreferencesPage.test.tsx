import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreferencesPage from '@/app/(authenticated)/preferences/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockGetPreferences = jest.fn();
const mockSetPreferences = jest.fn();

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@arcus/core/services', () => ({
  SessionService: {
    GetPreferences: (...args: any[]) => mockGetPreferences(...args),
    SetPreferences: (...args: any[]) => mockSetPreferences(...args),
  },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPreferences.mockResolvedValue({ prefs: {} });
  mockSetPreferences.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PreferencesPage – loading state', () => {
  it('shows loading message initially', () => {
    mockGetPreferences.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PreferencesPage />);
    expect(screen.getByText('Loading preferences...')).toBeInTheDocument();
  });

  it('shows heading while loading', () => {
    mockGetPreferences.mockReturnValue(new Promise(() => {}));
    render(<PreferencesPage />);
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });
});

describe('PreferencesPage – rendering', () => {
  it('shows Preferences heading after load', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.queryByText('Loading preferences...')).not.toBeInTheDocument());
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('shows Dashboard Cards section', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Dashboard Cards')).toBeInTheDocument());
  });

  it('renders all default card labels', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Climate')).toBeInTheDocument();
    expect(screen.getByText('Doors & Locks')).toBeInTheDocument();
    expect(screen.getByText('Cameras')).toBeInTheDocument();
    expect(screen.getByText('Care')).toBeInTheDocument();
    expect(screen.getByText('Lawn & Garden')).toBeInTheDocument();
    expect(screen.getByText('Lights & Switches')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('renders visibility toggle switches for each card', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(10);
  });

  it('renders move up/down buttons', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    const upButtons = screen.getAllByLabelText('Move up');
    const downButtons = screen.getAllByLabelText('Move down');
    expect(upButtons.length).toBe(10);
    expect(downButtons.length).toBe(10);
  });
});

describe('PreferencesPage – loading saved preferences', () => {
  it('applies saved card order from server', async () => {
    mockGetPreferences.mockResolvedValue({
      prefs: {
        'dashboard:cards': ['water', 'cameras', 'favorites'],
        'dashboard:hidden': ['cameras'],
      },
    });
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Water')).toBeInTheDocument());
    // The switches should reflect visibility
    const switches = screen.getAllByRole('switch');
    // Water is first, should be visible (aria-checked=true)
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    // Cameras is second, should be hidden
    expect(switches[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('handles load failure gracefully', async () => {
    mockGetPreferences.mockRejectedValue(new Error('fail'));
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.queryByText('Loading preferences...')).not.toBeInTheDocument());
    // Should still render with defaults
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });
});

describe('PreferencesPage – interactions', () => {
  it('does not show Save button initially', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('shows Save button after toggling visibility', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('shows Save button after reordering', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    const downButtons = screen.getAllByLabelText('Move down');
    fireEvent.click(downButtons[0]);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('calls SetPreferences on save', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]); // toggle Favorites visibility
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockSetPreferences).toHaveBeenCalled());
  });

  it('dispatches success notification on save', async () => {
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ type: 'success' }) }),
      ),
    );
  });

  it('dispatches error notification on save failure', async () => {
    mockSetPreferences.mockRejectedValue(new Error('fail'));
    render(<PreferencesPage />);
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument());
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ type: 'error' }) }),
      ),
    );
  });
});
