import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApiKeysPage from '@/app/(authenticated)/settings/api-keys/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockListKeys = jest.fn();
const mockCreate = jest.fn();
const mockRevoke = jest.fn();
const mockDelete = jest.fn();
const mockListAvailablePlaces = jest.fn();
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
      <button data-testid={`revoke-${apiKey.id}`} onClick={onRevoke}>Revoke</button>
      <button data-testid={`delete-${apiKey.id}`} onClick={onDelete}>Delete</button>
    </div>
  ),
}));

// The ACTIVE place is place-1 ("Home"); place-2 is "Lake House".
let mockPlaceId: string | null = 'place-1';

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { placeId: mockPlaceId },
    }),
}));

const twoKeys = [
  { id: 'k1', label: 'Home Assistant', permissions: ['devices:r'], status: 'active', created: 1700000000000 },
  { id: 'k2', label: 'Node-RED', permissions: ['devices:r', 'devices:w'], status: 'active', created: 1700000000000 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaceId = 'place-1';
  mockSearchPlaceId = null;
  mockListAvailablePlaces.mockResolvedValue({
    places: [
      { placeId: 'place-1', name: 'Home', role: 'OWNER' },
      { placeId: 'place-2', name: 'Lake House', role: 'OWNER' },
    ],
  });
  mockListKeys.mockResolvedValue({ keys: [] });
  mockCreate.mockResolvedValue({ key: 'new-api-key-123' });
  // mock window.confirm
  window.confirm = jest.fn(() => true);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ApiKeysPage – rendering', () => {
  it('matches snapshot', async () => {
    mockSearchPlaceId = 'place-2';
    mockListKeys.mockResolvedValue({ keys: twoKeys });
    const { container } = render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('apikeys-place')).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByTestId('key-card')).toHaveLength(2));
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
    mockListKeys.mockResolvedValue({
      keys: [
        { id: 'k1', label: 'Home Assistant', permissions: ['devices:r'], status: 'active', created: Date.now() },
        { id: 'k2', label: 'Node-RED', permissions: ['devices:r', 'devices:w'], status: 'active', created: Date.now() },
      ],
    });
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

  it('names the place whose keys are shown', async () => {
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Lake House'));
  });

  it('falls back to the active place when no placeId is given', async () => {
    render(<ApiKeysPage />);
    await waitFor(() => expect(mockListKeys).toHaveBeenCalledWith('place-1'));
    await waitFor(() => expect(screen.getByTestId('apikeys-place')).toHaveTextContent('for Home'));
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
  });

  it('confirms revoke with the key label and place name, then revokes at that place', async () => {
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('apikeys-place')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('revoke-k1'));

    expect(window.confirm).toHaveBeenCalledWith(
      'Revoke the API key "Home Assistant" for Lake House? This will immediately disable it.',
    );
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('place-2', 'k1'));
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
    mockRevoke.mockRejectedValue(new Error('fail'));
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('revoke-k1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('revoke-k1'));
    await waitFor(() => expect(screen.getByTestId('apikey-error')).toHaveTextContent('Failed to revoke API key.'));
  });

  it('confirms delete with the key label and place name, then deletes at that place', async () => {
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('apikeys-place')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-k2'));

    expect(window.confirm).toHaveBeenCalledWith(
      'Permanently delete the revoked API key "Node-RED" for Lake House?',
    );
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('place-2', 'k2'));
  });

  it('shows an error when delete fails', async () => {
    mockDelete.mockRejectedValue(new Error('fail'));
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('delete-k2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-k2'));
    await waitFor(() => expect(screen.getByTestId('apikey-error')).toHaveTextContent('Failed to delete API key.'));
  });

  it('falls back to "this place" when the place name cannot be loaded', async () => {
    mockListAvailablePlaces.mockRejectedValue(new Error('fail'));
    mockSearchPlaceId = 'place-2';
    render(<ApiKeysPage />);
    await waitFor(() => expect(screen.getByTestId('revoke-k1')).toBeInTheDocument());
    expect(screen.queryByTestId('apikeys-place')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('revoke-k1'));
    expect(window.confirm).toHaveBeenCalledWith(
      'Revoke the API key "Home Assistant" for this place? This will immediately disable it.',
    );
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('place-2', 'k1'));
  });
});
