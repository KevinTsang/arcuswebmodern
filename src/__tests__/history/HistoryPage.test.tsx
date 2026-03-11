import { render, screen, fireEvent, act } from '@testing-library/react';
import HistoryPage from '@/app/(authenticated)/history/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();
const mockLoadMore = jest.fn();

let mockHookAddress: string | undefined;
let mockHookResult = {
  entries: [] as any[],
  loading: false,
  hasMore: false,
  loadMore: mockLoadMore,
  refresh: mockRefresh,
};

jest.mock('@/components/history', () => ({
  HistoryList: ({ entries, loading, hasMore, onLoadMore }: any) => (
    <div data-testid="history-list">
      <span data-testid="entry-count">{entries.length}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="has-more">{String(hasMore)}</span>
      <button data-testid="load-more" onClick={onLoadMore}>Load More</button>
    </div>
  ),
  useHistoryFetch: (address: string) => {
    mockHookAddress = address;
    return mockHookResult;
  },
}));

let mockPlaceId: string | null = 'place-1';
let mockPlace: Record<string, unknown> | null = null;
let mockDevices: Record<string, unknown>[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { placeId: mockPlaceId, place: mockPlace },
      devices: {
        entities: Object.fromEntries(mockDevices.map((d, i) => [i, d])),
        ids: mockDevices.map((_, i) => i),
      },
    }),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: number) => state.devices.entities[id]),
}));

const now = Date.now();
const mockEntries = [
  { timestamp: now, subjectName: 'Lock', longMessage: 'Locked' },
  { timestamp: now - 1000, subjectName: 'Plug', longMessage: 'Turned on' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaceId = 'place-1';
  mockPlace = null;
  mockDevices = [];
  mockHookAddress = undefined;
  mockHookResult = {
    entries: [],
    loading: false,
    hasMore: false,
    loadMore: mockLoadMore,
    refresh: mockRefresh,
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HistoryPage – rendering', () => {
  it('shows the History heading', () => {
    render(<HistoryPage />);
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('shows Refresh button', () => {
    render(<HistoryPage />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('shows "Show All History" filter', () => {
    render(<HistoryPage />);
    expect(screen.getByText('Show All History')).toBeInTheDocument();
  });

  it('renders HistoryList component', () => {
    render(<HistoryPage />);
    expect(screen.getByTestId('history-list')).toBeInTheDocument();
  });
});

describe('HistoryPage – address resolution', () => {
  it('passes place address to useHistoryFetch', () => {
    render(<HistoryPage />);
    expect(mockHookAddress).toBe('SERV:place:place-1');
  });

  it('passes empty address when placeId is null', () => {
    mockPlaceId = null;
    render(<HistoryPage />);
    expect(mockHookAddress).toBe('');
  });
});

describe('HistoryPage – hook data passthrough', () => {
  it('passes entries to HistoryList', () => {
    mockHookResult = { ...mockHookResult, entries: mockEntries };
    render(<HistoryPage />);
    expect(screen.getByTestId('entry-count').textContent).toBe('2');
  });

  it('passes loading state to HistoryList', () => {
    mockHookResult = { ...mockHookResult, loading: true };
    render(<HistoryPage />);
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('passes hasMore to HistoryList', () => {
    mockHookResult = { ...mockHookResult, hasMore: true };
    render(<HistoryPage />);
    expect(screen.getByTestId('has-more').textContent).toBe('true');
  });

  it('passes loadMore to HistoryList onLoadMore', () => {
    render(<HistoryPage />);
    fireEvent.click(screen.getByTestId('load-more'));
    expect(mockLoadMore).toHaveBeenCalled();
  });
});

describe('HistoryPage – refresh', () => {
  it('calls refresh when Refresh button is clicked', () => {
    render(<HistoryPage />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('HistoryPage – device filtering', () => {
  beforeEach(() => {
    mockDevices = [
      { id: 'd1', 'base:id': 'dev-1', 'base:address': 'DRIV:dev:dev-1', 'dev:name': 'Front Door Lock' },
      { id: 'd2', 'base:id': 'dev-2', 'base:address': 'DRIV:dev:dev-2', 'dev:name': 'Motion Sensor' },
    ];
  });

  it('shows device selector when devices exist', () => {
    render(<HistoryPage />);
    expect(screen.getByText('By Device')).toBeInTheDocument();
    expect(screen.getByText('Choose a Device')).toBeInTheDocument();
  });

  it('lists devices in the selector', () => {
    render(<HistoryPage />);
    expect(screen.getByText('Front Door Lock')).toBeInTheDocument();
    expect(screen.getByText('Motion Sensor')).toBeInTheDocument();
  });

  it('passes device address to hook when a device is selected', () => {
    const { rerender } = render(<HistoryPage />);
    fireEvent.change(screen.getByDisplayValue('Choose a Device'), { target: { value: 'dev-1' } });
    rerender(<HistoryPage />);
    expect(mockHookAddress).toBe('DRIV:dev:dev-1');
  });

  it('reverts to place address when "Show All History" is clicked', () => {
    const { rerender } = render(<HistoryPage />);
    fireEvent.change(screen.getByDisplayValue('Choose a Device'), { target: { value: 'dev-1' } });
    rerender(<HistoryPage />);
    expect(mockHookAddress).toBe('DRIV:dev:dev-1');

    fireEvent.click(screen.getByText('Show All History'));
    rerender(<HistoryPage />);
    expect(mockHookAddress).toBe('SERV:place:place-1');
  });

  it('does not show device selector when no devices', () => {
    mockDevices = [];
    render(<HistoryPage />);
    expect(screen.queryByText('By Device')).not.toBeInTheDocument();
  });
});

describe('HistoryPage – premium notice', () => {
  it('shows upgrade notice for non-premium users', () => {
    mockPlace = { 'place:serviceLevel': 'BASIC' };
    render(<HistoryPage />);
    expect(screen.getByText(/Upgrade to Premium/)).toBeInTheDocument();
  });

  it('hides upgrade notice for premium users', () => {
    mockPlace = { 'place:serviceLevel': 'PREMIUM' };
    render(<HistoryPage />);
    expect(screen.queryByText(/Upgrade to Premium/)).not.toBeInTheDocument();
  });
});
