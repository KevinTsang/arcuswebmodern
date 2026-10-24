import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Place } from '@arcus/core';
import type { ApiKeyMeta } from '@arcus/core/services/ApiKeyService';
import type { ListAvailablePlacesResponse } from '@arcus/core/services/types';
import type { SessionPlace } from '@/arcus/types';
import type { PlaceData } from '@/store/entityTypes';
import ApiKeysPage from '@/app/(authenticated)/settings/api-keys/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockListKeys = jest.fn();
const mockCreate = jest.fn();
const mockRevoke = jest.fn();
const mockDelete = jest.fn();
const mockListAvailablePlaces = jest.fn();
const mockDispatch = jest.fn();
let mockSearchPlaceId: string | null = null;

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => (key === 'placeId' ? mockSearchPlaceId : null) }),
}));

jest.mock('@arcus/core/services', () => ({
  ApiKeyService: {
    ListKeys: (...args: any[]) => mockListKeys(...args),
    Create: (...args: any[]) => mockCreate(...args),
    Revoke: (...args: any[]) => mockRevoke(...args),
    Delete: (...args: any[]) => mockDelete(...args),
  },
  SessionService: {
    ListAvailablePlaces: (...args: any[]) => mockListAvailablePlaces(...args),
  },
}));

jest.mock('@/components/api-keys/permissions', () => ({
  emptyPermSet: () => ({ devices: { r: false, w: false, x: false } }),
  permSetToStrings: () => ['devices:r'],
  hasAnyPermission: (p: any) => Object.values(p).some((v: any) => v.r || v.w || v.x),
}));

jest.mock('@/components/api-keys/PermissionsTable', () => ({
  __esModule: true,
  default: ({ onToggle }: any) => (
    <div data-testid="permissions-table">
      <button onClick={() => onToggle('devices', 'r')}>Toggle perm</button>
    </div>
  ),
}));

jest.mock('@/components/api-keys/KeyCard', () => ({
  __esModule: true,
  default: ({ apiKey, onRevoke, onDelete }: any) => (
    <div data-testid="key-card">
      <span>{apiKey.label}</span>
      <button data-testid={`revoke-${apiKey.id}`} onClick={() => onRevoke(apiKey)}>Revoke</button>
      <button data-testid={`delete-${apiKey.id}`} onClick={() => onDelete(apiKey)}>Delete</button>
    </div>
  ),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

/** The slice of the store the page reads. */
interface MockState {
  place: { placeId: string | null; place: PlaceData | null };
  auth: { person: { places: SessionPlace[] } | null };
}

// The ACTIVE place is place-1 ("Home"). The SessionCreated snapshot lists the
// places known at sign-in: two owned, one guest.
let mockPlaceId: string | null = 'place-1';
let mockActivePlace: PlaceData | null = null;
let mockSessionPlaces: SessionPlace[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: <T,>(sel: (s: MockState) => T): T =>
    sel({
      place: { placeId: mockPlaceId, place: mockActivePlace },
      auth: { person: { places: mockSessionPlaces } },
    }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function sessionPlace(placeId: string, placeName: string, role: string): SessionPlace {
  return { placeId, placeName, role, accountId: `account-${placeId}` };
}

function makeKey(id: string, label: string, overrides: Partial<ApiKeyMeta> = {}): ApiKeyMeta {
  return {
    id,
    label,
    keyPrefix: `ak_${id}`,
    permissions: ['devices:r'],
    created: 1700000000000,
    lastUsed: null,
    expiresAt: null,
    expired: false,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const twoKeys = [makeKey('k1', 'Home Assistant'), makeKey('k2', 'Node-RED', { expired: true })];

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaceId = 'place-1';
  mockSearchPlaceId = null;
  mockActivePlace = { [Base.ATTR_ID]: 'place-1', [Place.ATTR_NAME]: 'Home' };
  mockSessionPlaces = [
    sessionPlace('place-1', 'Home', 'OWNER'),
    sessionPlace('place-2', 'Lake House', 'OWNER'),
    sessionPlace('place-3', 'Cabin', 'FULL_ACCESS'),
  ];
  mockListAvailablePlaces.mockResolvedValue({ places: [] });
  mockListKeys.mockResolvedValue({ keys: [] });
  mockCreate.mockResolvedValue({ key: 'new-api-key-123' });
  mockRevoke.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  // mock window.confirm
  window.confirm = jest.fn(() => true);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ApiKeysPage – rendering', () => {
  it('matches snapshot', async () => {
    mockSearchPlaceId = 'place-2';
    mockListKeys.mockResolvedValue({ keys: twoKeys });
    const { container } = render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getAllByTestId('key-card')).toHaveLength(2));
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for a place the user does not own', () => {
    mockSearchPlaceId = 'place-3';
    const { container } = render(<ApiKeysPage />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows API Keys heading', async () => {
    render(<ApiKeysPage />);
    // "API Keys" appears as both the page heading and the keys list heading
    await waitFor(() => expect(screen.getAllByText('API Keys').length).toBeGreaterThanOrEqual(1));
  });

  it('shows Settings breadcrumb link', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument());
  });

  it('shows loading state', () => {
    mockListKeys.mockReturnValue(new Promise(() => {}));
    render(<ApiKeysPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows loading state while the active place is not known yet', () => {
    mockPlaceId = null;
    mockActivePlace = null;
    render(<ApiKeysPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(mockListKeys).not.toHaveBeenCalled();
    expect(mockListAvailablePlaces).not.toHaveBeenCalled();
  });

  it('shows empty state when no keys', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('No API keys created yet.')).toBeInTheDocument());
  });

  it('shows New Key button', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('New Key')).toBeInTheDocument());
  });
});

describe('ApiKeysPage – with keys', () => {
  beforeEach(() => {
    mockListKeys.mockResolvedValue({ keys: twoKeys });
  });

  it('renders key cards', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('Home Assistant')).toBeInTheDocument());
    expect(screen.getByText('Node-RED')).toBeInTheDocument();
  });

  it('renders correct number of key cards', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => {
      const cards = screen.getAllByTestId('key-card');
      expect(cards.length).toBe(2);
    });
  });
});

describe('ApiKeysPage – create key', () => {
  it('shows create form when New Key is clicked', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('New Key')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Key'));
    expect(screen.getByText('Create API Key')).toBeInTheDocument();
  });

  it('shows label input and permissions table in create form', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('New Key')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Key'));
    expect(screen.getByPlaceholderText('e.g. Home Assistant Integration')).toBeInTheDocument();
    expect(screen.getByTestId('permissions-table')).toBeInTheDocument();
  });

  it('disables Create Key button when label is empty', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('New Key')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Key'));
    expect(screen.getByText('Create Key')).toBeDisabled();
  });

  it('shows cancel button in create form', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('New Key')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Key'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('hides create form on cancel', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('New Key')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Key'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Create API Key')).not.toBeInTheDocument();
  });
});

describe('ApiKeysPage – error handling', () => {
  it('shows error message when list fails', async () => {
    mockListKeys.mockRejectedValue(new Error('fail'));
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('Failed to load API keys.')).toBeInTheDocument());
  });
});

describe('ApiKeysPage – place scoping', () => {
  beforeEach(() => {
    mockListKeys.mockResolvedValue({ keys: twoKeys });
  });

  it('lists keys for the ?placeId= place, not the active place', async () => {
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(mockListKeys).toHaveBeenCalledWith('place-2'));
    expect(mockListKeys).not.toHaveBeenCalledWith('place-1');
  });

  it('names the place from the session without a platform round trip', () => {
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Lake House');
    expect(mockListAvailablePlaces).not.toHaveBeenCalled();
  });

  it('falls back to the active place when no placeId is given', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(mockListKeys).toHaveBeenCalledWith('place-1'));
    expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Home');
  });

  it("prefers the active place's current name over the sign-in snapshot", () => {
    mockActivePlace = { [Base.ATTR_ID]: 'place-1', [Place.ATTR_NAME]: 'Main House' };
    render(<ApiKeysPage />);
    expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Main House');
  });

  it('names an owned place without a name "Unnamed Place"', async () => {
    mockSessionPlaces = [sessionPlace('place-2', '', 'OWNER')];
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Unnamed Place');
    await waitFor(() => expect(screen.getByTestId('revoke-k1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('revoke-k1'));
    expect(window.confirm).toHaveBeenCalledWith(
      'Revoke the API key "Home Assistant" for Unnamed Place? This will immediately disable it.',
    );
  });

  it('creates the key at the ?placeId= place', async () => {
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('New Key')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Key'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Home Assistant Integration'), { target: { value: 'Widget' } });
    fireEvent.click(screen.getByText('Toggle perm'));
    fireEvent.click(screen.getByText('Create Key'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('place-2', 'Widget', ['devices:r']));
    expect(await screen.findByTestId('apikey-token')).toHaveTextContent('new-api-key-123');
  });

  it('confirms revoke with the key label and place name, then revokes at that place', async () => {
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('revoke-k1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('revoke-k1'));

    expect(window.confirm).toHaveBeenCalledWith(
      'Revoke the API key "Home Assistant" for Lake House? This will immediately disable it.',
    );
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('place-2', 'k1'));
    // Success: the list is reloaded and no error is shown.
    await waitFor(() => expect(mockListKeys).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('apikey-error')).not.toBeInTheDocument();
  });

  it('does not revoke when the confirm is dismissed', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('revoke-k1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('revoke-k1'));
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it('shows an error when revoke fails', async () => {
    mockRevoke.mockRejectedValueOnce(new Error('fail'));
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('revoke-k1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('revoke-k1'));
    await waitFor(() => expect(screen.getByTestId('apikey-error')).toHaveTextContent('Failed to revoke API key.'));
  });

  it('confirms delete with the key label and place name, then deletes at that place', async () => {
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('delete-k2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-k2'));

    expect(window.confirm).toHaveBeenCalledWith(
      'Permanently delete the revoked API key "Node-RED" for Lake House?',
    );
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('place-2', 'k2'));
    await waitFor(() => expect(mockListKeys).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('apikey-error')).not.toBeInTheDocument();
  });

  it('shows an error when delete fails', async () => {
    mockDelete.mockRejectedValueOnce(new Error('fail'));
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('delete-k2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-k2'));
    await waitFor(() => expect(screen.getByTestId('apikey-error')).toHaveTextContent('Failed to delete API key.'));
  });
});

describe('ApiKeysPage – owner only', () => {
  beforeEach(() => {
    mockListKeys.mockResolvedValue({ keys: twoKeys });
  });

  it('shows guests a message instead of the keys', () => {
    mockSearchPlaceId = 'place-3';
    render(<ApiKeysPage />);
    expect(screen.getByTestId('apikeys-not-owner')).toHaveTextContent(
      'Only the account owner can manage API keys for Cabin.',
    );
    expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Cabin');
    expect(screen.queryByText('New Key')).not.toBeInTheDocument();
    expect(screen.queryByTestId('key-card')).not.toBeInTheDocument();
    expect(mockListKeys).not.toHaveBeenCalled();
  });

  it('shows the message when the active place is a guest place', () => {
    mockPlaceId = 'place-3';
    mockActivePlace = { [Base.ATTR_ID]: 'place-3', [Place.ATTR_NAME]: 'Cabin' };
    render(<ApiKeysPage />);
    expect(screen.getByTestId('apikeys-not-owner')).toBeInTheDocument();
    expect(mockListKeys).not.toHaveBeenCalled();
  });
});

describe('ApiKeysPage – place added after sign-in', () => {
  beforeEach(() => {
    mockListKeys.mockResolvedValue({ keys: twoKeys });
  });

  it('looks up a place missing from the session, then lists its keys', async () => {
    const places = deferred<ListAvailablePlacesResponse>();
    mockListAvailablePlaces.mockReturnValue(places.promise);
    mockSearchPlaceId = 'place-4';
    render(<ApiKeysPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('New Key')).not.toBeInTheDocument();
    expect(mockListKeys).not.toHaveBeenCalled();

    await act(async () => {
      places.resolve({ places: [{ placeId: 'place-4', name: 'Barn', role: 'OWNER' }] });
    });
    expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Barn');
    await waitFor(() => expect(screen.getAllByTestId('key-card')).toHaveLength(2));
    expect(mockListKeys).toHaveBeenCalledWith('place-4');
  });

  it('shows the owner-only message for a guest place missing from the session', async () => {
    mockListAvailablePlaces.mockResolvedValue({ places: [{ placeId: 'place-4', name: 'Barn', role: 'FULL_ACCESS' }] });
    mockSearchPlaceId = 'place-4';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('apikeys-not-owner')).toHaveTextContent(
      'Only the account owner can manage API keys for Barn.',
    ));
    expect(mockListKeys).not.toHaveBeenCalled();
  });

  it('shows the owner-only message for a place the user cannot access', async () => {
    mockSearchPlaceId = 'place-unknown';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('apikeys-not-owner')).toHaveTextContent(
      'Only the account owner can manage API keys.',
    ));
    expect(screen.queryByTestId('apikeys-place')).not.toBeInTheDocument();
    expect(mockListKeys).not.toHaveBeenCalled();
  });

  it('reports a failed lookup and shows no keys', async () => {
    mockListAvailablePlaces.mockRejectedValue(new Error('fail'));
    mockSearchPlaceId = 'place-4';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('apikeys-unavailable')).toBeInTheDocument());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to load place details.' },
    });
    expect(screen.queryByTestId('apikeys-place')).not.toBeInTheDocument();
    expect(mockListKeys).not.toHaveBeenCalled();
  });

  it('ignores a lookup that finishes after the place changed', async () => {
    const places = deferred<ListAvailablePlacesResponse>();
    mockListAvailablePlaces.mockReturnValue(places.promise);
    mockSearchPlaceId = 'place-4';
    const { rerender } = render(<ApiKeysPage />);

    mockSearchPlaceId = 'place-3';
    rerender(<ApiKeysPage />);
    expect(screen.getByTestId('apikeys-not-owner')).toBeInTheDocument();

    await act(async () => {
      places.resolve({ places: [{ placeId: 'place-4', name: 'Barn', role: 'OWNER' }] });
    });
    expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Cabin');
    expect(screen.getByTestId('apikeys-not-owner')).toBeInTheDocument();
    expect(mockListKeys).not.toHaveBeenCalled();
  });
});

describe('ApiKeysPage – switching places while mounted', () => {
  it('clears the keys, new-key banner and create form of the previous place', async () => {
    mockListKeys.mockImplementation((placeId: string) =>
      Promise.resolve({ keys: placeId === 'place-2' ? twoKeys : [makeKey('k9', 'Garage Opener')] }),
    );
    mockSearchPlaceId = 'place-2';
    const { rerender } = render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getAllByTestId('key-card')).toHaveLength(2));

    // Create a key (shows the one-time token), then start another.
    fireEvent.click(screen.getByText('New Key'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Home Assistant Integration'), { target: { value: 'Widget' } });
    fireEvent.click(screen.getByText('Toggle perm'));
    fireEvent.click(screen.getByText('Create Key'));
    await waitFor(() => expect(screen.getByTestId('apikey-created')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Key'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Home Assistant Integration'), { target: { value: 'Half typed' } });

    mockSearchPlaceId = 'place-1';
    rerender(<ApiKeysPage />);

    expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Home');
    expect(screen.queryByTestId('apikey-created')).not.toBeInTheDocument();
    expect(screen.queryByText('Create API Key')).not.toBeInTheDocument();
    expect(screen.queryByText('Home Assistant')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Garage Opener')).toBeInTheDocument());
    expect(screen.getAllByTestId('key-card')).toHaveLength(1);
    expect(mockListKeys).toHaveBeenLastCalledWith('place-1');
  });

  it("drops the previous place's key list if it arrives late", async () => {
    const lakeKeys = deferred<{ keys: ApiKeyMeta[] }>();
    mockListKeys.mockImplementation((placeId: string) =>
      placeId === 'place-2' ? lakeKeys.promise : Promise.resolve({ keys: [makeKey('k9', 'Garage Opener')] }),
    );
    mockSearchPlaceId = 'place-2';
    const { rerender } = render(<ApiKeysPage />);

    mockSearchPlaceId = 'place-1';
    rerender(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByText('Garage Opener')).toBeInTheDocument());

    await act(async () => {
      lakeKeys.resolve({ keys: twoKeys });
    });
    expect(screen.getAllByTestId('key-card')).toHaveLength(1);
    expect(screen.queryByText('Home Assistant')).not.toBeInTheDocument();
  });

  it("revokes at the new place, not the previous one", async () => {
    mockListKeys.mockImplementation((placeId: string) =>
      Promise.resolve({ keys: placeId === 'place-2' ? twoKeys : [makeKey('k9', 'Garage Opener')] }),
    );
    mockSearchPlaceId = 'place-2';
    const { rerender } = render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getAllByTestId('key-card')).toHaveLength(2));

    mockSearchPlaceId = 'place-1';
    rerender(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('revoke-k9')).toBeInTheDocument());
    expect(screen.queryByTestId('revoke-k1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('revoke-k9'));

    expect(window.confirm).toHaveBeenCalledWith(
      'Revoke the API key "Garage Opener" for Home? This will immediately disable it.',
    );
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('place-1', 'k9'));
  });
});
