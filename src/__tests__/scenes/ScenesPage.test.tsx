import { render, screen, fireEvent } from '@testing-library/react';
import ScenesPage from '@/app/(authenticated)/scenes/page';
import { Base, Place, Scene } from '@arcus/core';
import type { SceneEntity } from '@/store/entityTypes';

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

jest.mock('@/components/scenes/ScenePanel', () => ({
  ScenePanel: () => <div>ScenePanel</div>,
}));

jest.mock('@/components/scenes/SceneCard', () => ({
  SceneCard: ({ scene, onEdit }: { scene: SceneEntity; onEdit: (s: SceneEntity) => void }) => (
    <div data-testid="scene-card">
      <span>{scene[Scene.ATTR_NAME] as string}</span>
      <button onClick={() => onEdit(scene)}>Edit</button>
    </div>
  ),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

let mockScenes: Partial<SceneEntity>[] = [];
let mockPlaceName: string = 'Your Home';

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      scenes: {
        entities: Object.fromEntries(mockScenes.map((s, i) => [`s${i}`, { ...s, id: `s${i}` }])),
        ids: mockScenes.map((_, i) => `s${i}`),
      },
      place: { place: { [Place.ATTR_NAME]: mockPlaceName } },
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
        [Base.ATTR_ADDRESS]: 'SERV:scene:s1',
        [Scene.ATTR_NAME]: 'Good Morning',
        [Scene.ATTR_ENABLED]: true,
        [Scene.ATTR_ACTIONS]: [{}, {}],
        [Scene.ATTR_NOTIFICATION]: false,
      },
      {
        [Base.ATTR_ADDRESS]: 'SERV:scene:s2',
        [Scene.ATTR_NAME]: 'Good Night',
        [Scene.ATTR_ENABLED]: true,
        [Scene.ATTR_ACTIONS]: [{}],
        [Scene.ATTR_NOTIFICATION]: true,
        [Scene.ATTR_SCHEDULER]: 'sched1',
      },
    ];
  });

  it('renders a SceneCard for each scene', () => {
    render(<ScenesPage />);
    const cards = screen.getAllByTestId('scene-card');
    expect(cards.length).toBe(2);
  });

  it('passes scene names to SceneCard', () => {
    render(<ScenesPage />);
    expect(screen.getByText('Good Morning')).toBeInTheDocument();
    expect(screen.getByText('Good Night')).toBeInTheDocument();
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
        [Base.ATTR_ADDRESS]: 'SERV:scene:s1',
        [Scene.ATTR_NAME]: 'Test Scene',
        [Scene.ATTR_ENABLED]: true,
        [Scene.ATTR_ACTIONS]: [],
        [Scene.ATTR_NOTIFICATION]: false,
      },
    ];
    render(<ScenesPage />);
    fireEvent.click(screen.getByText('Edit'));
    expect(mockOpenRight).toHaveBeenCalled();
    expect(mockExpandRight).toHaveBeenCalled();
  });
});
