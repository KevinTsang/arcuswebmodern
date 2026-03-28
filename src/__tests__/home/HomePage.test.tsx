import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '@/app/(authenticated)/home/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/devices', () => ({
  DevicePanel: () => <div>DevicePanel</div>,
}));

// ── Store state ───────────────────────────────────────────────────────

let mockPlace: Record<string, unknown> | null = null;
let mockPlaceId: string | null = null;
let mockPreferences: Record<string, unknown> | null = null;
let mockDevices: Record<string, unknown>[] = [];
let mockScenes: Record<string, unknown>[] = [];
let mockSubsystems: Record<string, unknown>[] = [];
let mockIncidents: Record<string, unknown>[] = [];
let mockPeople: Record<string, unknown>[] = [];

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { place: mockPlace, placeId: mockPlaceId, preferences: mockPreferences },
      devices: {
        entities: Object.fromEntries(mockDevices.map((d, i) => [`d${i}`, d])),
        ids: mockDevices.map((_, i) => `d${i}`),
      },
      scenes: {
        entities: Object.fromEntries(mockScenes.map((s, i) => [`s${i}`, s])),
        ids: mockScenes.map((_, i) => `s${i}`),
      },
      subsystems: {
        entities: Object.fromEntries(mockSubsystems.map((s, i) => [`sub${i}`, s])),
        ids: mockSubsystems.map((_, i) => `sub${i}`),
      },
      incidents: {
        entities: Object.fromEntries(mockIncidents.map((inc, i) => [`inc${i}`, inc])),
        ids: mockIncidents.map((_, i) => `inc${i}`),
      },
      people: {
        entities: Object.fromEntries(mockPeople.map((p, i) => [`p${i}`, p])),
        ids: mockPeople.map((_, i) => `p${i}`),
      },
    }),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: string) => state.devices.entities[id]),
}));

jest.mock('@/store/slices/scenesSlice', () => ({
  selectAllScenes: (state: any) => state.scenes.ids.map((id: string) => state.scenes.entities[id]),
}));

jest.mock('@/store/slices/subsystemsSlice', () => ({
  selectAllSubsystems: (state: any) => state.subsystems.ids.map((id: string) => state.subsystems.entities[id]),
}));

jest.mock('@/store/slices/incidentsSlice', () => ({
  selectAllIncidents: (state: any) => state.incidents.ids.map((id: string) => state.incidents.entities[id]),
}));

jest.mock('@/store/slices/peopleSlice', () => ({
  selectAllPeople: (state: any) => state.people.ids.map((id: string) => state.people.entities[id]),
}));

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockPlace = { 'place:name': 'Test Home' };
  mockPlaceId = 'place-1';
  mockPreferences = null;
  mockDevices = [];
  mockScenes = [];
  mockSubsystems = [];
  mockIncidents = [];
  mockPeople = [];
  mockBridgeRequest.mockResolvedValue({ results: [] });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HomePage – layout', () => {
  it('renders the place name in the sidebar', () => {
    render(<HomePage />);
    expect(screen.getByText('Test Home')).toBeInTheDocument();
  });

  it('falls back to "Your Home" when place name is missing', () => {
    mockPlace = null;
    render(<HomePage />);
    expect(screen.getByText('Your Home')).toBeInTheDocument();
  });

  it('renders the History heading', () => {
    render(<HomePage />);
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('renders the More link to /history', () => {
    render(<HomePage />);
    const moreLink = screen.getByText('More');
    expect(moreLink.closest('a')).toHaveAttribute('href', '/history');
  });

  it('shows "No recent activity." when no history events', () => {
    render(<HomePage />);
    expect(screen.getByText('No recent activity.')).toBeInTheDocument();
  });

  it('toggles sidebar visibility', () => {
    render(<HomePage />);
    expect(screen.getByText('Test Home')).toBeInTheDocument();

    const toggleBtn = screen.getByTitle('Hide sidebar');
    fireEvent.click(toggleBtn);
    expect(screen.queryByText('Test Home')).not.toBeInTheDocument();

    const showBtn = screen.getByTitle('Show sidebar');
    fireEvent.click(showBtn);
    expect(screen.getByText('Test Home')).toBeInTheDocument();
  });
});

describe('HomePage – history', () => {
  it('fetches dashboard history on mount', () => {
    render(<HomePage />);
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      'place:ListDashboardEntries',
      'SERV:place:place-1',
      { limit: 5 },
    );
  });

  it('does not fetch history when placeId is null', () => {
    mockPlaceId = null;
    render(<HomePage />);
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('renders history entries when returned', async () => {
    mockBridgeRequest.mockResolvedValue({
      results: [
        { timestamp: Date.now(), subjectName: 'Front Door', longMessage: 'Opened' },
      ],
    });
    render(<HomePage />);
    expect(await screen.findByText('Front Door')).toBeInTheDocument();
    expect(await screen.findByText('Opened')).toBeInTheDocument();
  });
});

describe('HomePage – Favorites card', () => {
  it('renders Favorites card by default', () => {
    render(<HomePage />);
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  it('shows empty message when no favorites', () => {
    render(<HomePage />);
    expect(screen.getByText('Mark devices and scenes as favorites to see them here.')).toBeInTheDocument();
  });

  it('shows favorite devices', () => {
    mockDevices = [
      { 'base:address': 'DRIV:dev:d1', 'dev:name': 'Bedroom Light', 'dev:favorite': true, id: 'd1' },
    ];
    render(<HomePage />);
    expect(screen.getByText('Bedroom Light')).toBeInTheDocument();
    expect(screen.getByText('1 favorite')).toBeInTheDocument();
  });

  it('shows favorite scenes', () => {
    mockScenes = [
      { 'base:address': 'SERV:scene:s1', 'scene:name': 'Goodnight', 'scene:favorite': true, id: 's1' },
    ];
    render(<HomePage />);
    expect(screen.getByText('Goodnight')).toBeInTheDocument();
  });

  it('shows plural count for multiple favorites', () => {
    mockDevices = [
      { 'base:address': 'DRIV:dev:d1', 'dev:name': 'Light 1', 'dev:favorite': true, id: 'd1' },
      { 'base:address': 'DRIV:dev:d2', 'dev:name': 'Light 2', 'dev:favorite': true, id: 'd2' },
    ];
    render(<HomePage />);
    expect(screen.getByText('2 favorites')).toBeInTheDocument();
  });
});

describe('HomePage – Alarms card', () => {
  beforeEach(() => {
    mockSubsystems = [
      { 'base:address': 'SERV:subalarm:place-1', 'subs:available': true },
    ];
  });

  it('renders Alarms card when alarm subsystem exists', () => {
    render(<HomePage />);
    expect(screen.getByText('Alarms')).toBeInTheDocument();
  });

  it('shows Disarmed when security mode is OFF', () => {
    render(<HomePage />);
    expect(screen.getByText('Disarmed')).toBeInTheDocument();
  });

  it('shows active alarm when incident is ALERT', () => {
    mockIncidents = [
      { 'incident:alertState': 'ALERT', 'incident:alert': 'Smoke detected' },
    ];
    render(<HomePage />);
    expect(screen.getByText('Alarm Active')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<HomePage />);
    const viewLink = screen.getAllByText('View →').find((el) => {
      const card = el.closest('[class*="border"]');
      return card?.textContent?.includes('Alarms');
    });
    expect(viewLink?.closest('a')).toHaveAttribute('href', '/services');
  });
});

describe('HomePage – card visibility', () => {
  it('does not render subsystem cards when subsystem is not available', () => {
    render(<HomePage />);
    // Without any subsystems, only Favorites should render
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.queryByText('Climate')).not.toBeInTheDocument();
    expect(screen.queryByText('Doors & Locks')).not.toBeInTheDocument();
    expect(screen.queryByText('Cameras')).not.toBeInTheDocument();
  });

  it('renders Climate card when climate subsystem exists', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subclimate:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.getByText('Climate')).toBeInTheDocument();
  });

  it('renders Doors & Locks card when subsystem exists', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subdoorsnlocks:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.getByText('Doors & Locks')).toBeInTheDocument();
  });

  it('renders Cameras card when subsystem exists', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subcameras:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.getByText('Cameras')).toBeInTheDocument();
  });

  it('renders Care card when subsystem exists', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subcare:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.getByText('Care')).toBeInTheDocument();
  });

  it('renders Home & Family card when subsystem exists', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subpresence:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.getByText('Home & Family')).toBeInTheDocument();
  });

  it('renders Lights & Switches card when subsystem exists', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:sublightsnswitches:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.getByText('Lights & Switches')).toBeInTheDocument();
  });

  it('renders Water card when subsystem exists', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subwater:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.getByText('Water')).toBeInTheDocument();
  });
});

describe('HomePage – card ordering from preferences', () => {
  it('hides cards marked as hideCard in preferences', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subclimate:place-1', 'subs:available': true },
    ];
    mockPreferences = {
      dashboardCards: [
        { serviceName: 'FAVORITES', hideCard: true },
        { serviceName: 'CLIMATE', hideCard: false },
      ],
    };
    render(<HomePage />);
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    expect(screen.getByText('Climate')).toBeInTheDocument();
  });
});

describe('HomePage – Pro Monitoring badge', () => {
  it('shows Pro badge when service level includes PROMON', () => {
    mockPlace = { 'place:name': 'Test Home', 'place:serviceLevel': 'PREMIUM_PROMON' };
    mockSubsystems = [
      { 'base:address': 'SERV:subalarm:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('does not show Pro badge without PROMON service level', () => {
    mockPlace = { 'place:name': 'Test Home', 'place:serviceLevel': 'PREMIUM' };
    mockSubsystems = [
      { 'base:address': 'SERV:subalarm:place-1', 'subs:available': true },
    ];
    render(<HomePage />);
    expect(screen.queryByText('Pro')).not.toBeInTheDocument();
  });
});
