import { render, screen, fireEvent } from '@testing-library/react';
import type { ApiKeyMeta } from '@arcus/core/services/ApiKeyService';
import { KeyList } from '@/components/api-keys/KeyList';

// ── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/components/api-keys/KeyCard', () => ({
  __esModule: true,
  default: ({ apiKey, onRevoke, onDelete }: { apiKey: ApiKeyMeta; onRevoke: (k: ApiKeyMeta) => void; onDelete: (k: ApiKeyMeta) => void }) => (
    <div data-testid={`key-card-${apiKey.id}`}>
      <button data-testid={`revoke-${apiKey.id}`} onClick={() => onRevoke(apiKey)}>Revoke</button>
      <button data-testid={`delete-${apiKey.id}`} onClick={() => onDelete(apiKey)}>Delete</button>
    </div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeKey(id: string, label: string): ApiKeyMeta {
  return {
    id,
    label,
    keyPrefix: `ak_${id}`,
    permissions: ['dev:r'],
    created: 1700000000000,
    lastUsed: null,
    expiresAt: null,
    expired: false,
  };
}

const KEYS = [makeKey('k1', 'Home Assistant'), makeKey('k2', 'Node-RED')];

const mockOnNewKey = jest.fn();
const mockOnRevoke = jest.fn();
const mockOnDelete = jest.fn();

function renderList(props: Partial<{ keys: ApiKeyMeta[]; loading: boolean; showNewKey: boolean }> = {}) {
  return render(
    <KeyList
      keys={props.keys ?? KEYS}
      loading={props.loading ?? false}
      showNewKey={props.showNewKey ?? true}
      onNewKey={mockOnNewKey}
      onRevoke={mockOnRevoke}
      onDelete={mockOnDelete}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('KeyList', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderList();
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders a card for each key', () => {
    renderList();
    expect(screen.getByTestId('key-card-k1')).toBeInTheDocument();
    expect(screen.getByTestId('key-card-k2')).toBeInTheDocument();
  });

  it('shows Loading... instead of the keys while loading', () => {
    renderList({ loading: true });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('key-card-k1')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no keys', () => {
    renderList({ keys: [] });
    expect(screen.getByTestId('apikeys-empty')).toHaveTextContent('No API keys created yet.');
  });

  it('calls onNewKey when New Key is clicked', () => {
    renderList();
    fireEvent.click(screen.getByTestId('apikey-new'));
    expect(mockOnNewKey).toHaveBeenCalledTimes(1);
  });

  it('hides New Key when showNewKey is false', () => {
    renderList({ showNewKey: false });
    expect(screen.queryByTestId('apikey-new')).not.toBeInTheDocument();
  });

  it('passes revoke and delete through for the chosen key', () => {
    renderList();
    fireEvent.click(screen.getByTestId('revoke-k2'));
    fireEvent.click(screen.getByTestId('delete-k1'));
    expect(mockOnRevoke).toHaveBeenCalledWith(KEYS[1]);
    expect(mockOnDelete).toHaveBeenCalledWith(KEYS[0]);
  });
});
