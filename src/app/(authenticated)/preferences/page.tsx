'use client';

/**
 * Preferences page — ported from src/pages/preferences/.
 *
 * Manages dashboard card ordering and visibility preferences.
 * Preferences are stored server-side via SessionService.
 */

import { useState, useEffect, useCallback } from 'react';
import { SessionService } from '@arcus/core/services';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

interface DashboardCard {
  key: string;
  label: string;
  visible: boolean;
}

const DEFAULT_CARDS: DashboardCard[] = [
  { key: 'favorites', label: 'Favorites', visible: true },
  { key: 'history', label: 'History', visible: true },
  { key: 'climate', label: 'Climate', visible: true },
  { key: 'doorsLocks', label: 'Doors & Locks', visible: true },
  { key: 'cameras', label: 'Cameras', visible: true },
  { key: 'care', label: 'Care', visible: true },
  { key: 'homeFamily', label: 'Home & Family', visible: true },
  { key: 'lawnGarden', label: 'Lawn & Garden', visible: true },
  { key: 'lights', label: 'Lights & Switches', visible: true },
  { key: 'water', label: 'Water', visible: true },
];

export default function PreferencesPage() {
  const dispatch = useAppDispatch();
  const [cards, setCards] = useState<DashboardCard[]>(DEFAULT_CARDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences
  useEffect(() => {
    SessionService.GetPreferences()
      .then((res) => {
        const prefs = res.prefs ?? {};
        const dashOrder = prefs['dashboard:cards'];
        const dashHidden = prefs['dashboard:hidden'];

        if (dashOrder) {
          const ordered: DashboardCard[] = dashOrder.map((key: string) => {
            const def = DEFAULT_CARDS.find((c) => c.key === key);
            return {
              key,
              label: def?.label ?? key,
              visible: !(dashHidden ?? []).includes(key),
            };
          });
          // Add any missing cards
          for (const def of DEFAULT_CARDS) {
            if (!ordered.find((c) => c.key === def.key)) {
              ordered.push({ ...def, visible: !(dashHidden ?? []).includes(def.key) });
            }
          }
          setCards(ordered);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleToggleVisibility = useCallback((key: string) => {
    setCards((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)),
    );
    setHasChanges(true);
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setCards((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setHasChanges(true);
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setCards((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const dashOrder = cards.map((c) => c.key);
      const dashHidden = cards.filter((c) => !c.visible).map((c) => c.key);

      await SessionService.SetPreferences({
        'dashboard:cards': dashOrder,
        'dashboard:hidden': dashHidden,
      });

      dispatch(addNotification({ type: 'success', message: 'Preferences saved' }));
      setHasChanges(false);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save preferences' }));
    }
    setSaving(false);
  }, [cards, dispatch]);

  if (loading) {
    return (
      <div className="p-[var(--gutter)]">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift mb-6">
          Preferences
        </h2>
        <p className="text-grouse">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="p-[var(--gutter)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Preferences
        </h2>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="max-w-lg">
        <h3 className="text-base font-medium text-swift mb-3">Dashboard Cards</h3>
        <p className="text-sm text-grouse mb-4">
          Reorder and show/hide cards on your dashboard.
        </p>

        <div className="space-y-1">
          {cards.map((card, index) => (
            <div
              key={card.key}
              className={`
                flex items-center gap-3 px-4 py-3 border rounded-[var(--border-radius-base)]
                ${card.visible ? 'border-heron bg-crane' : 'border-heron bg-pigeon opacity-60'}
              `}
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-xs text-grouse hover:text-swift disabled:opacity-30"
                  aria-label="Move up"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === cards.length - 1}
                  className="text-xs text-grouse hover:text-swift disabled:opacity-30"
                  aria-label="Move down"
                >
                  &#9660;
                </button>
              </div>

              {/* Card name */}
              <span className="flex-1 text-sm text-swift">{card.label}</span>

              {/* Visibility toggle */}
              <button
                onClick={() => handleToggleVisibility(card.key)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${card.visible ? 'bg-peacock' : 'bg-heron'}
                `}
                role="switch"
                aria-checked={card.visible}
              >
                <span
                  className={`
                    inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform
                    ${card.visible ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
