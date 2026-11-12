import { loadSceneActions } from '@/components/scenes/loadSceneActions';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockResolveSceneActions = jest.fn();

jest.mock('@/components/scenes/resolveSceneActions', () => ({
  resolveSceneActions: (...args: unknown[]) => mockResolveSceneActions(...args),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const RESOLVED = {
  actions: [{ id: 'action1', name: 'Lights', satisfiable: true, selectors: {} }],
  templateAddress: 'SERV:scenetmpl:custom',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockResolveSceneActions.mockResolvedValue(RESOLVED);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('loadSceneActions', () => {
  it('resolves the actions for the place and template', async () => {
    await expect(loadSceneActions('place-1', 'custom', mockDispatch)).resolves.toBe(RESOLVED);
    expect(mockResolveSceneActions).toHaveBeenCalledWith('place-1', 'custom');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('resolves to no actions and notifies when resolving fails', async () => {
    mockResolveSceneActions.mockRejectedValueOnce(new Error('fail'));
    await expect(loadSceneActions('place-1', undefined, mockDispatch)).resolves.toEqual({
      actions: [],
      templateAddress: '',
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to load scene actions' },
    });
  });
});
