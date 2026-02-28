'use client';

/**
 * Scenes page — ported from src/pages/scenes/.
 *
 * Lists all scenes for the active place. Users can fire, rename,
 * toggle notifications, and edit scenes.
 */

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllScenes } from '@/store/slices/scenesSlice';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';

// ── Scene Card ────────────────────────────────────────────────────────

function SceneCard({
  scene,
  onEdit,
}: {
  scene: Record<string, unknown>;
  onEdit: (scene: Record<string, unknown>) => void;
}) {
  const dispatch = useAppDispatch();
  const [firing, setFiring] = useState(false);

  const name = (scene['scene:name'] as string) ?? 'Unnamed Scene';
  const address = scene['base:address'] as string;
  const enabled = scene['scene:enabled'] !== false;
  const actionCount = Array.isArray(scene['scene:actions'])
    ? (scene['scene:actions'] as unknown[]).length
    : 0;
  const hasNotification = scene['scene:notification'] === true;
  const hasSchedule = !!scene['scene:scheduler'];

  const handleFire = useCallback(async () => {
    if (!enabled || firing) return;
    setFiring(true);
    try {
      await Bridge.request('scene:Fire', address, {});
      dispatch(addNotification({ type: 'success', message: `${name} executed` }));
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to run ${name}` }));
    }
    // Brief animation delay before resetting
    setTimeout(() => setFiring(false), 1500);
  }, [address, enabled, firing, name, dispatch]);

  const handleToggleNotification = useCallback(async () => {
    try {
      await Bridge.request('base:SetAttributes', address, {
        'scene:notification': !hasNotification,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update notification setting' }));
    }
  }, [address, hasNotification, dispatch]);

  return (
    <div
      className={`
        border rounded-[var(--border-radius-base)] p-4
        ${enabled ? 'border-heron bg-crane' : 'border-heron bg-pigeon opacity-60'}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-swift truncate">{name}</h3>
          <p className="text-sm text-grouse mt-1">
            {actionCount} action{actionCount !== 1 ? 's' : ''}
            {hasSchedule && ' \u00B7 Scheduled'}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={handleToggleNotification}
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

      <div className="flex items-center gap-2">
        <button
          onClick={handleFire}
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
          className="px-4 py-2 rounded-[var(--border-radius-base)] text-sm font-medium border border-heron text-coot hover:bg-pigeon transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ── Scene Edit Panel (Side Panel Content) ─────────────────────────────

function SceneEditPanel({ scene }: { scene: Record<string, unknown> }) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const [name, setName] = useState((scene['scene:name'] as string) ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const address = scene['base:address'] as string;

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await Bridge.request('base:SetAttributes', address, {
        'scene:name': name.trim(),
      });
      dispatch(addNotification({ type: 'success', message: 'Scene saved' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save scene' }));
    }
    setSaving(false);
  }, [address, name, dispatch, closeRight]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await Bridge.request('scene:Delete', address, {});
      dispatch(addNotification({ type: 'success', message: 'Scene deleted' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete scene' }));
    }
    setDeleting(false);
  }, [address, dispatch, closeRight]);

  return (
    <div>
      <h3 className="text-lg font-semibold text-swift mb-4">Edit Scene</h3>

      <div className="mb-4">
        <label htmlFor="sceneName" className="block text-sm font-medium text-swift mb-1">
          Scene Name
        </label>
        <input
          id="sceneName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
        />
      </div>

      <p className="text-sm text-grouse mb-6">
        Full scene action editing will be available in a future update.
      </p>

      <div className="flex gap-3 mb-8">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={closeRight}
          className="border border-heron text-coot px-5 py-2 rounded-[var(--border-radius-base)] hover:bg-pigeon transition-colors text-sm"
        >
          Cancel
        </button>
      </div>

      <hr className="border-heron mb-4" />

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-sm text-cardinal hover:underline"
        >
          Delete Scene
        </button>
      ) : (
        <div>
          <p className="text-sm text-swift mb-3">Are you sure you want to delete this scene?</p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-cardinal text-crane px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="border border-heron text-coot px-4 py-2 rounded-[var(--border-radius-base)] text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────

export default function ScenesPage() {
  const scenes = useAppSelector(selectAllScenes);
  const placeName = useAppSelector(
    (s) => (s.place.place?.['place:name'] as string) ?? 'Your Home',
  );
  const { openRight } = useSidePanel();

  const handleEdit = useCallback(
    (scene: Record<string, unknown>) => {
      openRight(<SceneEditPanel scene={scene} />);
    },
    [openRight],
  );

  return (
    <div className="p-[var(--gutter)]">
      {/* Context bar */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Scenes
        </h2>
        <span className="text-sm text-grouse">{placeName}</span>
      </div>

      {scenes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-grouse mb-2">No scenes configured yet.</p>
          <p className="text-sm text-grouse">
            Scenes let you control multiple devices with a single tap.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
