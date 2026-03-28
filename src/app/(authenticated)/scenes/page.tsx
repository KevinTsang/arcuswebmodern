'use client';

/**
 * Scenes page — ported from src/pages/scenes/.
 *
 * Lists all scenes for the active place. Users can fire, rename,
 * toggle notifications, and edit scenes.
 */

import { useCallback } from 'react';
import { Place } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllScenes } from '@/store/slices/scenesSlice';
import { useSidePanel } from '@/components/SidePanel';
import { ScenePanel } from '@/components/scenes/ScenePanel';
import { SceneCard } from '@/components/scenes/SceneCard';

// ── Page Component ────────────────────────────────────────────────────

export default function ScenesPage() {
  const scenes = useAppSelector(selectAllScenes);
  const placeName = useAppSelector(
    (s) => s.place.place?.[Place.ATTR_NAME] ?? 'Your Home',
  );
  const { openRight, expandRight } = useSidePanel();

  const handleEdit = useCallback(
    (scene: Record<string, unknown>) => {
      openRight(<ScenePanel scene={scene} />);
      expandRight();
    },
    [openRight, expandRight],
  );

  const handleAddScene = useCallback(() => {
    openRight(<ScenePanel />);
    expandRight();
  }, [openRight, expandRight]);

  return (
    <div className="p-[var(--gutter)]">
      {/* Context bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
            Scenes
          </h2>
          <button
            onClick={handleAddScene}
            className="bg-peacock text-crane px-3 py-1.5 rounded-[var(--border-radius-base)] hover:opacity-90 text-sm font-medium"
          >
            + Add Scene
          </button>
        </div>
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
