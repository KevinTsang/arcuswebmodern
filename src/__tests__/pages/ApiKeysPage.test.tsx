import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApiKeysPage from '@/app/(authenticated)/settings/api-keys/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockListKeys = jest.fn();
const mockCreate = jest.fn();
const mockRevoke = jest.fn();
const mockDelete = jest.fn();

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@arcus/core/services', () => ({
  ApiKeyService: {
    ListKeys: (...args: any[]) => mockListKeys(...args),
    Create: (...args: any[]) => mockCreate(...args),
    Revoke: (...args: any[]) => mockRevoke(...args),
    Delete: (...args: any[]) => mockDelete(...args),
  },
}));

jest.mock('@/components/api-key/permissions', () => ({
  emptyPermSet: () => ({ devices: { r: false, w: false, x: false } }),
  permSetToStrings: () => ['devices:r'],
  hasAnyPermission: (p: any) => Object.values(p).some((v: any) => v.r || v.w || v.x),
}));

jest.mock('@/components/api-key/PermissionsTable', () => ({
  __esModule: true,
  default: ({ onToggle }: any) => (
    <div data-testid="permissions-table">
      <button onClick={() => onToggle('devices', 'r')}>Toggle perm</button>
    </div>
  ),
}));

jest.mock('@/components/api-key/KeyCard', () => ({
  __esModule: true,
  default: ({ apiKey, onRevoke, onDelete }: any) => (
    <div data-testid="key-card">
      <span>{apiKey.label}</span>
      <button onClick={onRevoke}>Revoke</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
}));

let mockPlaceId: string | null = 'place-1';

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { placeId: mockPlaceId },
    }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaceId = 'place-1';
  mockListKeys.mockResolvedValue({ keys: [] });
  mockCreate.mockResolvedValue({ key: 'new-api-key-123' });
  // mock window.confirm
  window.confirm = jest.fn(() => true);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ApiKeysPage – rendering', () => {
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
