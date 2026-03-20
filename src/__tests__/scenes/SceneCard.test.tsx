import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SceneCard } from '@/components/scene/SceneCard';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const baseScene = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  'base:address': 'SERV:scene:s1',
  'scene:name': 'Good Morning',
  'scene:enabled': true,
  'scene:actions': [{}, {}],
  'scene:notification': false,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SceneCard – rendering', () => {
  it('renders the scene name', () => {
    render(<SceneCard scene={baseScene()} onEdit={jest.fn()} />);
    expect(screen.getByText('Good Morning')).toBeInTheDocument();
  });

  it('shows "Unnamed Scene" when name is missing', () => {
    render(<SceneCard scene={baseScene({ 'scene:name': undefined })} onEdit={jest.fn()} />);
    expect(screen.getByText('Unnamed Scene')).toBeInTheDocument();
  });

  it('shows action count with plural', () => {
    render(<SceneCard scene={baseScene({ 'scene:actions': [{}, {}] })} onEdit={jest.fn()} />);
    expect(screen.getByText('2 actions')).toBeInTheDocument();
  });

  it('shows singular action for 1 action', () => {
    render(<SceneCard scene={baseScene({ 'scene:actions': [{}] })} onEdit={jest.fn()} />);
    expect(screen.getByText(/1 action(?!s)/)).toBeInTheDocument();
  });

  it('shows 0 actions when actions is not an array', () => {
    render(<SceneCard scene={baseScene({ 'scene:actions': undefined })} onEdit={jest.fn()} />);
    expect(screen.getByText('0 actions')).toBeInTheDocument();
  });

  it('shows Scheduled indicator when scheduler is present', () => {
    render(<SceneCard scene={baseScene({ 'scene:scheduler': 'sched1' })} onEdit={jest.fn()} />);
    expect(screen.getByText(/Scheduled/)).toBeInTheDocument();
  });

  it('does not show Scheduled when no scheduler', () => {
    render(<SceneCard scene={baseScene()} onEdit={jest.fn()} />);
    expect(screen.queryByText(/Scheduled/)).not.toBeInTheDocument();
  });

  it('renders Run Scene button', () => {
    render(<SceneCard scene={baseScene()} onEdit={jest.fn()} />);
    expect(screen.getByText('Run Scene')).toBeInTheDocument();
  });

  it('renders Edit button', () => {
    render(<SceneCard scene={baseScene()} onEdit={jest.fn()} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('disables Run Scene when scene is not enabled', () => {
    render(<SceneCard scene={baseScene({ 'scene:enabled': false })} onEdit={jest.fn()} />);
    expect(screen.getByText('Run Scene')).toBeDisabled();
  });
});

describe('SceneCard – notification toggle', () => {
  it('shows "Notifications off" title when notifications are off', () => {
    render(<SceneCard scene={baseScene({ 'scene:notification': false })} onEdit={jest.fn()} />);
    expect(screen.getByTitle('Notifications off')).toBeInTheDocument();
  });

  it('shows "Notifications on" title when notifications are on', () => {
    render(<SceneCard scene={baseScene({ 'scene:notification': true })} onEdit={jest.fn()} />);
    expect(screen.getByTitle('Notifications on')).toBeInTheDocument();
  });

  it('calls Bridge to toggle notification on', async () => {
    render(<SceneCard scene={baseScene({ 'scene:notification': false })} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByTitle('Notifications off'));
    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'base:SetAttributes',
        'SERV:scene:s1',
        { 'scene:notification': true },
      );
    });
  });

  it('calls Bridge to toggle notification off', async () => {
    render(<SceneCard scene={baseScene({ 'scene:notification': true })} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByTitle('Notifications on'));
    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'base:SetAttributes',
        'SERV:scene:s1',
        { 'scene:notification': false },
      );
    });
  });

  it('dispatches error notification when toggle fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<SceneCard scene={baseScene({ 'scene:notification': false })} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByTitle('Notifications off'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error', message: 'Failed to update notification setting' }),
        }),
      );
    });
  });
});

describe('SceneCard – fire scene', () => {
  it('calls Bridge.request with scene:Fire on Run Scene click', async () => {
    render(<SceneCard scene={baseScene()} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByText('Run Scene'));
    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith('scene:Fire', 'SERV:scene:s1', {});
    });
  });

  it('dispatches success notification after firing', async () => {
    render(<SceneCard scene={baseScene()} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByText('Run Scene'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'success', message: 'Good Morning executed' }),
        }),
      );
    });
  });

  it('shows Running... text while firing', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<SceneCard scene={baseScene()} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByText('Run Scene'));
    expect(screen.getByText('Running...')).toBeInTheDocument();
  });

  it('dispatches error notification when fire fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<SceneCard scene={baseScene()} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByText('Run Scene'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error', message: 'Failed to run Good Morning' }),
        }),
      );
    });
  });

  it('does not fire when scene is disabled', () => {
    render(<SceneCard scene={baseScene({ 'scene:enabled': false })} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByText('Run Scene'));
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});

describe('SceneCard – edit', () => {
  it('calls onEdit with the scene when Edit is clicked', () => {
    const onEdit = jest.fn();
    const scene = baseScene();
    render(<SceneCard scene={scene} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(scene);
  });
});
