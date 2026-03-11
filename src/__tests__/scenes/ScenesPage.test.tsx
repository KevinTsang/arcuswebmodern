import { render, screen, fireEvent } from '@testing-library/react';
import ScenesPage from '@/app/(authenticated)/scenes/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockOpenRight = jest.fn();
const mockExpandRight = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight, expandRight: mockExpandRight }),
}));

jest.mock('@/components/scene/ScenePanel', () => ({
  ScenePanel: () => <div>ScenePanel</div>,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

let mockScenes: Record<string, unknown>[] = [];
let mockPlaceName: string = 'Your Home';

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      scenes: {
        entities: Object.fromEntries(mockScenes.map((s, i) => [`s${i}`, { ...s, id: `s${i}` }])),
        ids: mockScenes.map((_, i) => `s${i}`),
      },
      place: { place: { 'place:name': mockPlaceName } },
    }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/scenesSlice', () => ({
  selectAllScenes: (state: any) => state.scenes.ids.map((id: string) => state.scenes.entities[id]),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockScenes = [];
  mockPlaceName = 'Your Home';
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ScenesPage – rendering', () => {
  it('shows Scenes heading', () => {
    render(<ScenesPage />);
    expect(screen.getByText('Scenes')).toBeInTheDocument();
  });

  it('shows place name', () => {
    mockPlaceName = 'Lake House';
    render(<ScenesPage />);
    expect(screen.getByText('Lake House')).toBeInTheDocument();
  });

  it('shows + Add Scene button', () => {
    render(<ScenesPage />);
    expect(screen.getByText('+ Add Scene')).toBeInTheDocument();
  });

  it('shows empty state when no scenes', () => {
    render(<ScenesPage />);
    expect(screen.getByText('No scenes configured yet.')).toBeInTheDocument();
  });
});

describe('ScenesPage – with scenes', () => {
  beforeEach(() => {
    mockScenes = [
      {
        'base:address': 'SERV:scene:s1',
        'scene:name': 'Good Morning',
        'scene:enabled': true,
        'scene:actions': [{}, {}],
        'scene:notification': false,
      },
      {
        'base:address': 'SERV:scene:s2',
        'scene:name': 'Good Night',
        'scene:enabled': true,
        'scene:actions': [{}],
        'scene:notification': true,
        'scene:scheduler': 'sched1',
      },
    ];
  });

  it('renders scene names', () => {
    render(<ScenesPage />);
    expect(screen.getByText('Good Morning')).toBeInTheDocument();
    expect(screen.getByText('Good Night')).toBeInTheDocument();
  });

  it('shows action count', () => {
    render(<ScenesPage />);
    expect(screen.getByText('2 actions')).toBeInTheDocument();
    expect(screen.getByText('1 action')).toBeInTheDocument();
  });

  it('shows Scheduled indicator', () => {
    render(<ScenesPage />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('renders Run Scene buttons', () => {
    render(<ScenesPage />);
    const runButtons = screen.getAllByText('Run Scene');
    expect(runButtons.length).toBe(2);
  });

  it('renders Edit buttons', () => {
    render(<ScenesPage />);
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBe(2);
  });

  it('does not show empty state', () => {
    render(<ScenesPage />);
    expect(screen.queryByText('No scenes configured yet.')).not.toBeInTheDocument();
  });
});

describe('ScenesPage – interactions', () => {
  it('opens side panel when + Add Scene is clicked', () => {
    render(<ScenesPage />);
    fireEvent.click(screen.getByText('+ Add Scene'));
    expect(mockOpenRight).toHaveBeenCalled();
    expect(mockExpandRight).toHaveBeenCalled();
  });

  it('opens side panel when Edit is clicked', () => {
    mockScenes = [
      {
        'base:address': 'SERV:scene:s1',
        'scene:name': 'Test Scene',
        'scene:enabled': true,
        'scene:actions': [],
        'scene:notification': false,
      },
    ];
    render(<ScenesPage />);
    fireEvent.click(screen.getByText('Edit'));
    expect(mockOpenRight).toHaveBeenCalled();
    expect(mockExpandRight).toHaveBeenCalled();
  });
});
