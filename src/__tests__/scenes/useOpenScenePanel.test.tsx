import { renderHook } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Base, Scene } from '@arcus/core';
import { useOpenScenePanel } from '@/components/scenes/useOpenScenePanel';
import type { SceneEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
const mockExpandRight = jest.fn();
const mockDispatch = jest.fn();
const mockLoadSceneActions = jest.fn();

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight, expandRight: mockExpandRight }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ place: { placeId: 'place-1' } }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/components/scenes/loadSceneActions', () => ({
  loadSceneActions: (...args: unknown[]) => mockLoadSceneActions(...args),
}));

jest.mock('@/components/scenes/ScenePanel', () => ({
  ScenePanel: () => null,
}));

// ── Helpers ───────────────────────────────────────────────────────────

interface OpenedPanelProps {
  scene?: SceneEntity;
  actions: Promise<unknown>;
}

const openedPanel = () => (mockOpenRight.mock.calls[0][0] as ReactElement<OpenedPanelProps>).props;

const LOAD = Promise.resolve({ actions: [], templateAddress: '' });

const scene: SceneEntity = {
  id: 'SERV:scene:abc',
  [Base.ATTR_ADDRESS]: 'SERV:scene:abc',
  [Scene.ATTR_NAME]: 'Morning',
  [Scene.ATTR_TEMPLATE]: 'custom',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadSceneActions.mockReturnValue(LOAD);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useOpenScenePanel', () => {
  it('opens Create Scene expanded, resolving actions for the place', () => {
    const { result } = renderHook(() => useOpenScenePanel());
    result.current();
    expect(mockLoadSceneActions).toHaveBeenCalledWith('place-1', undefined, mockDispatch);
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Create Scene', key: 'scene:new' });
    expect(openedPanel()).toEqual({ scene: undefined, actions: LOAD });
    expect(mockExpandRight).toHaveBeenCalled();
  });

  it("opens Edit Scene expanded, resolving actions for the scene's template", () => {
    const { result } = renderHook(() => useOpenScenePanel());
    result.current(scene);
    expect(mockLoadSceneActions).toHaveBeenCalledWith('place-1', 'custom', mockDispatch);
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Edit Scene', key: `scene:${scene[Base.ATTR_ADDRESS]}` });
    expect(openedPanel()).toEqual({ scene, actions: LOAD });
    expect(mockExpandRight).toHaveBeenCalled();
  });
});
