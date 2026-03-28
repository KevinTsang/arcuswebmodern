import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScenePanel } from '@/components/scenes/ScenePanel';
import Bridge from '@arcus/core/bridge';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({ place: { placeId: 'place-1' } }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

const mockResolveSceneActions = jest.fn();
jest.mock('@/components/scenes/resolveSceneActions', () => ({
  resolveSceneActions: (...args: unknown[]) => mockResolveSceneActions(...args),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

// Mock child components to isolate ScenePanel logic
jest.mock('@/components/scenes/ActionCategoryList', () => ({
  ActionCategoryList: ({
    name,
    heading,
    saveLabel,
    onSelectAction,
    onSave,
    onCancel,
    satisfiableActions,
    saving,
  }: Record<string, unknown>) => (
    <div data-testid="category-list">
      <span data-testid="heading">{heading as string}</span>
      <span data-testid="scene-name">{name as string}</span>
      <span data-testid="save-label">{saveLabel as string}</span>
      <span data-testid="action-count">{(satisfiableActions as unknown[]).length}</span>
      <span data-testid="saving">{String(saving)}</span>
      <button onClick={() => (onSelectAction as (id: string) => void)('action1')}>select-action</button>
      <button onClick={onSave as () => void}>save</button>
      <button onClick={onCancel as () => void}>cancel</button>
    </div>
  ),
}));

jest.mock('@/components/scenes/ActionDeviceConfigurator', () => ({
  ActionDeviceConfigurator: ({ action, onBack }: { action: { name: string }; onBack: () => void }) => (
    <div data-testid="device-configurator">
      <span>{action.name}</span>
      <button onClick={onBack}>back</button>
    </div>
  ),
}));

const mockBridge = Bridge.request as jest.Mock;

const mockScene: Record<string, unknown> = {
  'base:address': 'SERV:scene:abc-123',
  'scene:name': 'Morning Routine',
  'scene:template': 'custom',
  'scene:actions': [
    {
      name: 'Turn Lights On or Off',
      template: 'action1',
      context: {
        'DRIV:dev:light1': { switch: 'ON' },
      },
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockResolveSceneActions.mockResolvedValue({
    actions: [
      { id: 'action1', name: 'Lights', satisfiable: true, selectors: { 'DRIV:dev:light1': [] } },
      { id: 'action2', name: 'Locks', satisfiable: false, selectors: {} },
    ],
    templateAddress: 'SERV:scenetmpl:custom',
  });
  mockBridge.mockResolvedValue({});
});

// ── Create Mode ───────────────────────────────────────────────────────

describe('ScenePanel (create mode)', () => {
  it('shows loading state initially', () => {
    mockResolveSceneActions.mockReturnValue(new Promise(() => {}));
    render(<ScenePanel />);
    expect(screen.getByText('Loading actions...')).toBeInTheDocument();
    expect(screen.getByText('Create Scene')).toBeInTheDocument();
  });

  it('loads actions and renders ActionCategoryList', async () => {
    render(<ScenePanel />);
    await waitFor(() => {
      expect(screen.getByTestId('category-list')).toBeInTheDocument();
    });
    expect(screen.getByTestId('scene-name')).toHaveTextContent('New Scene');
    expect(screen.getByTestId('action-count')).toHaveTextContent('1');
  });

  it('calls resolveSceneActions with placeId only', async () => {
    render(<ScenePanel />);
    await waitFor(() => screen.getByTestId('category-list'));
    expect(mockResolveSceneActions).toHaveBeenCalledWith('place-1', undefined);
  });

  it('dispatches error notification on load failure', async () => {
    mockResolveSceneActions.mockRejectedValue(new Error('fail'));
    render(<ScenePanel />);
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error', message: 'Failed to load scene actions' }),
        }),
      );
    });
  });

  it('renders with Create Scene heading and label', async () => {
    render(<ScenePanel />);
    await waitFor(() => screen.getByTestId('category-list'));
    expect(screen.getByTestId('heading')).toHaveTextContent('Create Scene');
    expect(screen.getByTestId('save-label')).toHaveTextContent('Create Scene');
  });

  it('navigates to device configurator when action selected', async () => {
    render(<ScenePanel />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('select-action'));
    expect(screen.getByTestId('device-configurator')).toBeInTheDocument();
    expect(screen.getByText('Lights')).toBeInTheDocument();
  });

  it('navigates back from device configurator', async () => {
    render(<ScenePanel />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('select-action'));
    expect(screen.getByTestId('device-configurator')).toBeInTheDocument();
    fireEvent.click(screen.getByText('back'));
    expect(screen.getByTestId('category-list')).toBeInTheDocument();
  });

  it('calls closeRight on cancel', async () => {
    render(<ScenePanel />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('does not show delete button', async () => {
    render(<ScenePanel />);
    await waitFor(() => screen.getByTestId('category-list'));
    expect(screen.queryByText('Delete Scene')).not.toBeInTheDocument();
  });
});

// ── Edit Mode ─────────────────────────────────────────────────────────

describe('ScenePanel (edit mode)', () => {
  it('shows loading state with Edit Scene heading', () => {
    mockResolveSceneActions.mockReturnValue(new Promise(() => {}));
    render(<ScenePanel scene={mockScene} />);
    expect(screen.getByText('Loading actions...')).toBeInTheDocument();
    expect(screen.getByText('Edit Scene')).toBeInTheDocument();
  });

  it('renders with Edit Scene heading and Save label', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    expect(screen.getByTestId('heading')).toHaveTextContent('Edit Scene');
    expect(screen.getByTestId('save-label')).toHaveTextContent('Save');
  });

  it('pre-populates scene name from existing scene', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    expect(screen.getByTestId('scene-name')).toHaveTextContent('Morning Routine');
  });

  it('calls resolveSceneActions with placeId and template id', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    expect(mockResolveSceneActions).toHaveBeenCalledWith('place-1', 'custom');
  });

  it('dispatches error notification on load failure', async () => {
    mockResolveSceneActions.mockRejectedValue(new Error('fail'));
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error', message: 'Failed to load scene actions' }),
        }),
      );
    });
  });

  it('navigates to device configurator when action selected', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('select-action'));
    expect(screen.getByTestId('device-configurator')).toBeInTheDocument();
    expect(screen.getByText('Lights')).toBeInTheDocument();
  });

  it('navigates back from device configurator', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('select-action'));
    fireEvent.click(screen.getByText('back'));
    expect(screen.getByTestId('category-list')).toBeInTheDocument();
  });

  it('saves via base:SetAttributes with scene:name and scene:actions', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        'base:SetAttributes',
        'SERV:scene:abc-123',
        expect.objectContaining({
          'scene:name': 'Morning Routine',
          'scene:actions': expect.arrayContaining([
            expect.objectContaining({ template: 'action1' }),
          ]),
        }),
      );
    });
  });

  it('calls closeRight on cancel', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('shows delete button', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    expect(screen.getByText('Delete Scene')).toBeInTheDocument();
  });

  it('shows confirmation on delete click', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('Delete Scene'));
    expect(screen.getByText('Are you sure you want to delete this scene?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
  });

  it('deletes scene on confirm', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('Delete Scene'));
    fireEvent.click(screen.getByText('Yes, Delete'));

    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith('scene:Delete', 'SERV:scene:abc-123', {});
    });
  });

  it('cancels delete confirmation', async () => {
    render(<ScenePanel scene={mockScene} />);
    await waitFor(() => screen.getByTestId('category-list'));
    fireEvent.click(screen.getByText('Delete Scene'));
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.getByText('Delete Scene')).toBeInTheDocument();
  });
});
