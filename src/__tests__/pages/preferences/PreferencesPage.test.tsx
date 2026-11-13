import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreferencesPage from '@/app/(authenticated)/preferences/page';
import type { Preferences } from '@arcus/core/services/types';
import { DEFAULT_DASHBOARD_CARDS } from '@/lib/dashboardCards';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockGetPreferences = jest.fn();
const mockSetPreferences = jest.fn();
let mockStoredPreferences: Preferences | null = null;

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: { place: { preferences: Preferences | null } }) => unknown) =>
    sel({ place: { preferences: mockStoredPreferences } }),
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

jest.mock('@/store/slices/placeSlice', () => ({
  setPreferences: (payload: unknown) => ({ type: 'place/setPreferences', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SAVE_SUCCESS = { type: 'ui/addNotification', payload: { type: 'success', message: 'Preferences saved' } };
const SAVE_ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to save preferences' } };

async function renderLoaded() {
  const view = render(<PreferencesPage />);
  await screen.findByTestId('preferences-cards-title');
  return view;
}

function positionOf(serviceName: string) {
  return screen.getByTestId(`preference-card-${serviceName}`).getAttribute('data-position');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStoredPreferences = null;
  mockGetPreferences.mockResolvedValue({ prefs: {} });
  mockSetPreferences.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PreferencesPage – snapshot', () => {
  it('matches snapshot', async () => {
    const { asFragment } = await renderLoaded();
    expect(asFragment()).toMatchSnapshot();
  });
});

describe('PreferencesPage – loading state', () => {
  it('shows loading message initially', () => {
    mockGetPreferences.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PreferencesPage />);
    expect(screen.getByText('Loading preferences...')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });
});

describe('PreferencesPage – rendering', () => {
  it('shows the Dashboard Cards section', async () => {
    await renderLoaded();
    expect(screen.getByText('Dashboard Cards')).toBeInTheDocument();
  });

  it('lists every dashboard card in the default order when nothing is saved', async () => {
    await renderLoaded();
    DEFAULT_DASHBOARD_CARDS.forEach((card, i) => {
      expect(positionOf(card.serviceName)).toBe(String(i + 1));
    });
    for (const label of [
      'Favorites', 'History', 'Lights & Switches', 'Alarms', 'Climate', 'Doors & Locks',
      'Cameras', 'Care', 'Home & Family', 'Lawn & Garden', 'Water',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders a visibility switch and reorder buttons for each card', async () => {
    await renderLoaded();
    expect(screen.getAllByRole('switch')).toHaveLength(DEFAULT_DASHBOARD_CARDS.length);
    expect(screen.getAllByLabelText('Move up')).toHaveLength(DEFAULT_DASHBOARD_CARDS.length);
    expect(screen.getAllByLabelText('Move down')).toHaveLength(DEFAULT_DASHBOARD_CARDS.length);
  });

  it('disables moving the first card up and the last card down', async () => {
    await renderLoaded();
    expect(screen.getByTestId('preference-move-up-FAVORITES')).toBeDisabled();
    expect(screen.getByTestId('preference-move-down-WATER')).toBeDisabled();
  });
});

describe('PreferencesPage – loading saved preferences', () => {
  it('applies the saved dashboardCards order and visibility', async () => {
    mockGetPreferences.mockResolvedValue({
      prefs: {
        dashboardCards: [
          { serviceName: 'WATER', hideCard: false },
          { serviceName: 'CAMERAS', hideCard: true },
          { serviceName: 'FAVORITES', hideCard: false },
        ],
      },
    });
    await renderLoaded();
    expect(positionOf('WATER')).toBe('1');
    expect(positionOf('CAMERAS')).toBe('2');
    expect(positionOf('FAVORITES')).toBe('3');
    expect(screen.getByTestId('preference-visible-WATER')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('preference-visible-CAMERAS')).toHaveAttribute('aria-checked', 'false');
  });

  it('appends cards missing from the saved list and drops unknown ones', async () => {
    mockGetPreferences.mockResolvedValue({
      prefs: {
        dashboardCards: [
          { serviceName: 'CLIMATE', hideCard: true },
          { serviceName: 'ENERGY', hideCard: false },
        ],
      },
    });
    await renderLoaded();
    expect(positionOf('CLIMATE')).toBe('1');
    expect(positionOf('FAVORITES')).toBe('2');
    expect(screen.queryByTestId('preference-card-ENERGY')).not.toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(DEFAULT_DASHBOARD_CARDS.length);
  });

  it('ignores the old dashboard:cards keys', async () => {
    mockGetPreferences.mockResolvedValue({
      prefs: { 'dashboard:cards': ['water'], 'dashboard:hidden': ['favorites'] },
    });
    await renderLoaded();
    expect(positionOf('FAVORITES')).toBe('1');
    expect(screen.getByTestId('preference-visible-FAVORITES')).toHaveAttribute('aria-checked', 'true');
  });

  it('falls back to the defaults when loading fails', async () => {
    mockGetPreferences.mockRejectedValue(new Error('fail'));
    await renderLoaded();
    expect(positionOf('FAVORITES')).toBe('1');
    expect(screen.queryByText('Loading preferences...')).not.toBeInTheDocument();
  });
});

describe('PreferencesPage – interactions', () => {
  it('does not show Save button initially', async () => {
    await renderLoaded();
    expect(screen.queryByTestId('preferences-save')).not.toBeInTheDocument();
  });

  it('toggles a card hidden', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByTestId('preference-visible-CAMERAS'));
    expect(screen.getByTestId('preference-visible-CAMERAS')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('preferences-save')).toBeInTheDocument();
  });

  it('moves a card up and down', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByTestId('preference-move-up-CLIMATE'));
    expect(positionOf('CLIMATE')).toBe('4');
    expect(positionOf('ALARMS')).toBe('5');
    fireEvent.click(screen.getByTestId('preference-move-down-FAVORITES'));
    expect(positionOf('FAVORITES')).toBe('2');
    expect(positionOf('HISTORY')).toBe('1');
  });

  it('saves the cards as dashboardCards and updates the stored preferences', async () => {
    mockStoredPreferences = { hideTutorials: true };
    await renderLoaded();
    fireEvent.click(screen.getByTestId('preference-move-up-CLIMATE'));
    fireEvent.click(screen.getByTestId('preference-visible-CAMERAS'));
    fireEvent.click(screen.getByTestId('preferences-save'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(SAVE_SUCCESS));
    const expected = resolveExpected();
    expect(mockSetPreferences).toHaveBeenCalledWith({ dashboardCards: expected });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'place/setPreferences',
      payload: { hideTutorials: true, dashboardCards: expected },
    });
    expect(screen.queryByTestId('preferences-save')).not.toBeInTheDocument();
  });

  it('reports a failure to save and keeps the changes', async () => {
    mockSetPreferences.mockRejectedValueOnce(new Error('fail'));
    await renderLoaded();
    fireEvent.click(screen.getByTestId('preference-visible-WATER'));
    fireEvent.click(screen.getByTestId('preferences-save'));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(SAVE_ERROR));
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'place/setPreferences' }));
    expect(screen.getByTestId('preferences-save')).toBeEnabled();
    expect(screen.getByTestId('preference-visible-WATER')).toHaveAttribute('aria-checked', 'false');
  });
});

/** The default cards with Climate moved above Alarms and Cameras hidden. */
function resolveExpected() {
  const cards = DEFAULT_DASHBOARD_CARDS.map((c) => ({
    ...c,
    hideCard: c.serviceName === 'CAMERAS',
  }));
  const climate = cards.findIndex((c) => c.serviceName === 'CLIMATE');
  [cards[climate - 1], cards[climate]] = [cards[climate], cards[climate - 1]];
  return cards;
}
