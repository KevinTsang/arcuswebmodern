import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FavoriteSceneChip from '@/components/home/FavoriteSceneChip';
import { Base, Scene } from '@arcus/core';
import type { SceneEntity } from '@/store/entityTypes';

const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();

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

function scene(name?: string, address = 'SERV:scene:s1'): SceneEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    ...(name ? { [Scene.ATTR_NAME]: name } : {}),
  } as SceneEntity;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

describe('FavoriteSceneChip', () => {
  it('renders the scene name', () => {
    render(<FavoriteSceneChip scene={scene('Movie Time')} />);
    expect(screen.getByRole('button', { name: 'Movie Time' })).toBeInTheDocument();
  });

  it('fires the scene and notifies on success', async () => {
    render(<FavoriteSceneChip scene={scene('Movie Time')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Movie Time' }));

    await waitFor(() =>
      expect(mockBridgeRequest).toHaveBeenCalledWith(Scene.CMD_FIRE, 'SERV:scene:s1', {}),
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Movie Time executed' },
    });
  });

  it('notifies on fire failure', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('boom'));
    render(<FavoriteSceneChip scene={scene('Movie Time')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Movie Time' }));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to run Movie Time' },
      }),
    );
  });

  it('falls back to "Scene" when unnamed', () => {
    render(<FavoriteSceneChip scene={scene()} />);
    expect(screen.getByRole('button', { name: 'Scene' })).toBeInTheDocument();
  });
});
