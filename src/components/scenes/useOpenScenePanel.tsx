'use client';

import { useCallback } from 'react';
import { Base, Scene } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useSidePanel } from '@/components/SidePanel';
import type { SceneEntity } from '@/store/entityTypes';
import { loadSceneActions } from './loadSceneActions';
import { ScenePanel } from './ScenePanel';

/**
 * Returns a callback that opens the scene editor in the expanded right panel,
 * editing `scene` or creating one when it is omitted. It starts resolving the
 * scene actions first, so the panel suspends until they arrive.
 */
export function useOpenScenePanel(): (scene?: SceneEntity) => void {
  const placeId = useAppSelector((s) => s.place.placeId) ?? '';
  const dispatch = useAppDispatch();
  const { openRight, expandRight } = useSidePanel();

  return useCallback(
    (scene?: SceneEntity) => {
      const actions = loadSceneActions(placeId, scene?.[Scene.ATTR_TEMPLATE] as string | undefined, dispatch);
      openRight(<ScenePanel scene={scene} actions={actions} />, {
        title: scene ? 'Edit Scene' : 'Create Scene',
        key: `scene:${scene?.[Base.ATTR_ADDRESS] ?? 'new'}`,
      });
      expandRight();
    },
    [placeId, dispatch, openRight, expandRight],
  );
}
