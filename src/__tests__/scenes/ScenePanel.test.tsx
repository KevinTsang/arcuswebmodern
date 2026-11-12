import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ScenePanel } from '@/components/scenes/ScenePanel';
import type { ResolveResult } from '@/components/scenes/resolveSceneActions';
import { renderSuspended } from '../helpers/renderSuspended';
import { Base, Scene } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import type { SceneEntity } from '@/store/entityTypes';

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

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

// Mock child components to isolate ScenePanel logic
jest.mock('@/components/scenes/ActionCategoryList', () => ({
  ActionCategoryList: ({
    name,
    saveLabel,
    onSelectAction,
    onSave,
    onCancel,
    satisfiableActions,
    saving,
  }: any) => (
    <div data-testid="category-list">
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

const mockScene: SceneEntity = {
  id: 'SERV:scene:abc-123',
  [Base.ATTR_ADDRESS]: 'SERV:scene:abc-123',
  [Scene.ATTR_NAME]: 'Morning Routine',
  [Scene.ATTR_TEMPLATE]: 'custom',
  [Scene.ATTR_ACTIONS]: [
    {
      name: 'Turn Lights On or Off',
      template: 'action1',
      context: {
        'DRIV:dev:light1': { switch: 'ON' },
      },
    },
  ],
};

const RESOLVED: ResolveResult = {
  actions: [
    { id: 'action1', name: 'Lights', satisfiable: true, selectors: { 'DRIV:dev:light1': [] } },
    { id: 'action2', name: 'Locks', satisfiable: false, selectors: {} },
  ],
  templateAddress: 'SERV:scenetmpl:custom',
};

/** What loadSceneActions resolves to when resolving fails. */
const UNRESOLVED: ResolveResult = { actions: [], templateAddress: '' };

function renderPanel(scene?: SceneEntity, resolved: ResolveResult = RESOLVED) {
  return renderSuspended(<ScenePanel scene={scene} actions={Promise.resolve(resolved)} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridge.mockResolvedValue({});
});

// ── Create Mode ───────────────────────────────────────────────────────

describe('ScenePanel (create mode)', () => {
  it('matches snapshot', async () => {
    const { asFragment } = await renderPanel();
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the fallback until the actions resolve', async () => {
    await renderSuspended(<ScenePanel actions={new Promise(() => {})} />);
    expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('category-list')).not.toBeInTheDocument();
  });

  it('does not create a scene when the actions could not be resolved', async () => {
    await renderPanel(undefined, UNRESOLVED);
    expect(screen.getByTestId('action-count')).toHaveTextContent('0');
    fireEvent.click(screen.getByText('save'));
    expect(mockBridge).not.toHaveBeenCalled();
  });

  it('loads actions and renders ActionCategoryList', async () => {
    await renderPanel();
    expect(screen.getByTestId('category-list')).toBeInTheDocument();
    expect(screen.getByTestId('scene-name')).toHaveTextContent('New Scene');
    expect(screen.getByTestId('action-count')).toHaveTextContent('1');
  });

  it('renders with the Create Scene label', async () => {
    await renderPanel();
    expect(screen.getByTestId('save-label')).toHaveTextContent('Create Scene');
  });

  it('navigates to device configurator when action selected', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('select-action'));
    expect(screen.getByTestId('device-configurator')).toBeInTheDocument();
    expect(screen.getByText('Lights')).toBeInTheDocument();
  });

  it('navigates back from device configurator', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('select-action'));
    expect(screen.getByTestId('device-configurator')).toBeInTheDocument();
    fireEvent.click(screen.getByText('back'));
    expect(screen.getByTestId('category-list')).toBeInTheDocument();
  });

  it('calls closeRight on cancel', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('does not show delete button', async () => {
    await renderPanel();
    expect(screen.queryByText('Delete Scene')).not.toBeInTheDocument();
  });
});

// ── Edit Mode ─────────────────────────────────────────────────────────

describe('ScenePanel (edit mode)', () => {
  it('renders with the Save label', async () => {
    await renderPanel(mockScene);
    expect(screen.getByTestId('save-label')).toHaveTextContent('Save');
  });

  it('pre-populates scene name from existing scene', async () => {
    await renderPanel(mockScene);
    expect(screen.getByTestId('scene-name')).toHaveTextContent('Morning Routine');
  });

  it('navigates to device configurator when action selected', async () => {
    await renderPanel(mockScene);
    fireEvent.click(screen.getByText('select-action'));
    expect(screen.getByTestId('device-configurator')).toBeInTheDocument();
    expect(screen.getByText('Lights')).toBeInTheDocument();
  });

  it('navigates back from device configurator', async () => {
    await renderPanel(mockScene);
    fireEvent.click(screen.getByText('select-action'));
    fireEvent.click(screen.getByText('back'));
    expect(screen.getByTestId('category-list')).toBeInTheDocument();
  });

  it('saves via base:SetAttributes with scene:name and scene:actions', async () => {
    await renderPanel(mockScene);
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:scene:abc-123',
        expect.objectContaining({
          [Scene.ATTR_NAME]: 'Morning Routine',
          [Scene.ATTR_ACTIONS]: expect.arrayContaining([
            expect.objectContaining({ template: 'action1' }),
          ]),
        }),
      );
    });
  });

  it('calls closeRight on cancel', async () => {
    await renderPanel(mockScene);
    fireEvent.click(screen.getByText('cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('shows delete button', async () => {
    await renderPanel(mockScene);
    expect(screen.getByText('Delete Scene')).toBeInTheDocument();
  });

  it('shows confirmation on delete click', async () => {
    await renderPanel(mockScene);
    fireEvent.click(screen.getByText('Delete Scene'));
    expect(screen.getByText('Are you sure you want to delete this scene?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
  });

  it('deletes scene on confirm', async () => {
    await renderPanel(mockScene);
    fireEvent.click(screen.getByText('Delete Scene'));
    fireEvent.click(screen.getByText('Yes, Delete'));

    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Scene.CMD_DELETE, 'SERV:scene:abc-123', {});
    });
  });

  it('keeps the saved actions when the actions could not be resolved', async () => {
    await renderPanel(mockScene, UNRESOLVED);
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:scene:abc-123',
        expect.objectContaining({
          [Scene.ATTR_ACTIONS]: [
            { name: 'Turn Lights On or Off', template: 'action1', context: { 'DRIV:dev:light1': { switch: 'ON' } } },
          ],
        }),
      );
    });
  });

  it('dispatches an error notification when saving fails', async () => {
    mockBridge.mockRejectedValueOnce(new Error('fail'));
    await renderPanel(mockScene);
    fireEvent.click(screen.getByText('save'));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { type: 'error', message: 'Failed to save scene' } }),
      ),
    );
    expect(mockCloseRight).not.toHaveBeenCalled();
  });

  it('cancels delete confirmation', async () => {
    await renderPanel(mockScene);
    fireEvent.click(screen.getByText('Delete Scene'));
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.getByText('Delete Scene')).toBeInTheDocument();
  });
});
