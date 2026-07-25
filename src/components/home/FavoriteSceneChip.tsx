'use client';

import { useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Scene } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import type { SceneEntity } from '@/store/entityTypes';

const CHIP_CLASS =
  'flex-shrink-0 w-28 text-center p-2 border border-heron rounded-[var(--border-radius-base)] transition-colors hover:border-peacock hover:bg-pigeon/30 focus:outline-none focus:border-peacock';

/** A favorite scene on the dashboard — fires the scene when clicked. */
export default function FavoriteSceneChip({ scene }: { scene: SceneEntity }) {
  const dispatch = useAppDispatch();
  const name = scene[Scene.ATTR_NAME] ?? 'Scene';
  const address = scene[Base.ATTR_ADDRESS];

  const handleFire = useCallback(async () => {
    try {
      await Bridge.request(Scene.CMD_FIRE, address, {});
      dispatch(addNotification({ type: 'success', message: `${name} executed` }));
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to run ${name}` }));
    }
  }, [address, name, dispatch]);

  return (
    <button type="button" onClick={handleFire} className={CHIP_CLASS} title={`Run ${name}`}>
      <div className="w-10 h-10 bg-peacock/10 rounded-full flex items-center justify-center mx-auto mb-1">
        <span className="icon-app-scene-1 text-sm text-peacock" />
      </div>
      <p className="text-xs text-swift truncate">{name}</p>
    </button>
  );
}
