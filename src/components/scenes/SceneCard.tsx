'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Scene } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { ScheduleEditPanel } from '@/components/schedules';
import { ControlSwitch } from '@/components/shared/ControlSwitch';
import type { SceneEntity } from '@/store/entityTypes';

/** Scenes are scheduled by firing `scene:Fire` on the platform "FIRE" schedule group. */
const SCENE_FIRE_SCHEDULE = 'FIRE';

export function SceneCard({
  scene,
  onEdit,
}: {
  scene: SceneEntity;
  onEdit: (scene: SceneEntity) => void;
}) {
  const dispatch = useAppDispatch();
  const { openRight } = useSidePanel();
  const [firing, setFiring] = useState(false);

  const name = scene[Scene.ATTR_NAME] ?? 'Unnamed Scene';
  const address = scene[Base.ATTR_ADDRESS];
  const sceneId = scene[Base.ATTR_ID] ?? address;
  const enabled = scene[Scene.ATTR_ENABLED] !== false;
  const actionCount = Array.isArray(scene[Scene.ATTR_ACTIONS])
    ? scene[Scene.ATTR_ACTIONS]?.length
    : 0;
  const hasNotification = scene[Scene.ATTR_NOTIFICATION] === true;
  const hasSchedule = !!scene[Scene.ATTR_SCHEDULER];
  const [forceDeviceState, setForceDeviceState] = useState(
    scene[Scene.ATTR_FILTERUNCHANGED] !== true,
  );

  const handleFire = useCallback(async () => {
    if (!enabled || firing) return;
    setFiring(true);
    try {
      await Bridge.request(Scene.CMD_FIRE, address, {});
      dispatch(addNotification({ type: 'success', message: `${name} executed` }));
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to run ${name}` }));
    }
    // Brief animation delay before resetting
    setTimeout(() => setFiring(false), 1500);
  }, [address, enabled, firing, name, dispatch]);

  const handleToggleNotification = useCallback(async () => {
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, {
        [Scene.ATTR_NOTIFICATION]: !hasNotification,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update notification setting' }));
    }
  }, [address, hasNotification, dispatch]);

  const handleOpenSchedule = useCallback(() => {
    openRight(
      <ScheduleEditPanel
        targetAddress={address}
        targetName={name}
        scheduleId={SCENE_FIRE_SCHEDULE}
        messageType={Scene.CMD_FIRE}
      />,
    );
  }, [openRight, address, name]);

  const handleToggleForce = useCallback(async (checked: boolean) => {
    setForceDeviceState(checked);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, {
        [Scene.ATTR_FILTERUNCHANGED]: !checked,
      });
    } catch {
      setForceDeviceState(!checked);
      dispatch(addNotification({ type: 'error', message: 'Failed to update force device state setting' }));
    }
  }, [address, dispatch]);

  return (
    <div
      data-testid={`scene-card-${sceneId}`}
      className={`
        border rounded-[var(--border-radius-base)] p-4
        ${enabled ? 'border-heron bg-crane' : 'border-heron bg-pigeon opacity-60'}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 data-testid={`scene-name-${sceneId}`} className="text-base font-medium text-swift truncate">{name}</h3>
          <p data-testid={`scene-meta-${sceneId}`} className="text-sm text-grouse mt-1">
            {actionCount} action{actionCount !== 1 ? 's' : ''}
            {hasSchedule && ' \u00B7 Scheduled'}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={handleOpenSchedule}
            data-testid={`scene-schedule-${sceneId}`}
            className={`p-1.5 rounded transition-colors ${
              hasSchedule ? 'text-peacock' : 'text-heron hover:text-grouse'
            }`}
            title="Schedule"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={handleToggleNotification}
            data-testid={`scene-notification-${sceneId}`}
            data-enabled={hasNotification}
            className={`p-1.5 rounded transition-colors ${
              hasNotification ? 'text-peacock' : 'text-heron hover:text-grouse'
            }`}
            title={hasNotification ? 'Notifications on' : 'Notifications off'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <ControlSwitch
          checked={forceDeviceState}
          onChange={handleToggleForce}
          label="Force Device State"
          testId={`scene-force-state-${sceneId}`}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleFire}
          data-testid={`scene-run-${sceneId}`}
          disabled={!enabled || firing}
          className={`
            flex-1 px-4 py-2 rounded-[var(--border-radius-base)] text-sm font-medium
            transition-all
            ${firing
              ? 'bg-lovebird text-crane'
              : 'bg-peacock text-crane hover:opacity-90'}
            disabled:opacity-40
          `}
        >
          {firing ? 'Running...' : 'Run Scene'}
        </button>
        <button
          onClick={() => onEdit(scene)}
          data-testid={`scene-edit-${sceneId}`}
          className="px-4 py-2 rounded-[var(--border-radius-base)] text-sm font-medium border border-heron text-coot hover:bg-pigeon transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
