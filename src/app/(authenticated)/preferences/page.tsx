'use client';

/**
 * Preferences page — ported from src/pages/preferences/.
 *
 * Manages dashboard card ordering and visibility preferences.
 * Preferences are stored server-side via SessionService under the
 * `dashboardCards` key that the dashboard (and the mobile apps) read.
 */

import { useState, useEffect, useCallback } from 'react';
import { SessionService } from '@arcus/core/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { setPreferences } from '@/store/slices/placeSlice';
import {
  dashboardCardLabel, resolveDashboardCards, type DashboardCardName, type DashboardCardPreference,
} from '@/lib/dashboardCards';

export default function PreferencesPage() {
  const dispatch = useAppDispatch();
  const storedPreferences = useAppSelector((s) => s.place.preferences);
  const [cards, setCards] = useState<DashboardCardPreference[]>(() => resolveDashboardCards(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences
  useEffect(() => {
    SessionService.GetPreferences()
      .then((res) => {
        setCards(resolveDashboardCards(res.prefs));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleToggleVisibility = useCallback((name: DashboardCardName) => {
    setCards((prev) =>
      prev.map((c) => (c.serviceName === name ? { ...c, hideCard: !c.hideCard } : c)),
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
      await SessionService.SetPreferences({ dashboardCards: cards });
      // Update the copy the dashboard reads; SetPreferences merges keys, so do the same.
      dispatch(setPreferences({ ...storedPreferences, dashboardCards: cards }));

      dispatch(addNotification({ type: 'success', message: 'Preferences saved' }));
      setHasChanges(false);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save preferences' }));
    }
    setSaving(false);
  }, [cards, dispatch, storedPreferences]);

  if (loading) {
    return (
      <div className="p-[var(--gutter)]">
        <h2 data-testid="preferences-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift mb-6">
          Preferences
        </h2>
        <p className="text-grouse">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="p-[var(--gutter)]">
      <div className="flex items-center justify-between mb-6">
        <h2 data-testid="preferences-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Preferences
        </h2>
        {hasChanges && (
          <button
            onClick={handleSave}
            data-testid="preferences-save"
            disabled={saving}
            className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="max-w-lg">
        <h3 data-testid="preferences-cards-title" className="text-base font-medium text-swift mb-3">Dashboard Cards</h3>
        <p className="text-sm text-grouse mb-4">
          Reorder and show/hide cards on your dashboard.
        </p>

        <div className="space-y-1">
          {cards.map((card, index) => (
            <div
              key={card.serviceName}
              data-testid={`preference-card-${card.serviceName}`}
              data-position={index + 1}
              className={`
                flex items-center gap-3 px-4 py-3 border rounded-[var(--border-radius-base)]
                ${card.hideCard ? 'border-heron bg-pigeon opacity-60' : 'border-heron bg-crane'}
              `}
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  data-testid={`preference-move-up-${card.serviceName}`}
                  disabled={index === 0}
                  className="text-xs text-grouse hover:text-swift disabled:opacity-30"
                  aria-label="Move up"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  data-testid={`preference-move-down-${card.serviceName}`}
                  disabled={index === cards.length - 1}
                  className="text-xs text-grouse hover:text-swift disabled:opacity-30"
                  aria-label="Move down"
                >
                  &#9660;
                </button>
              </div>

              {/* Card name */}
              <span className="flex-1 text-sm text-swift">{dashboardCardLabel(card.serviceName)}</span>

              {/* Visibility toggle */}
              <button
                onClick={() => handleToggleVisibility(card.serviceName)}
                data-testid={`preference-visible-${card.serviceName}`}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${!card.hideCard ? 'bg-peacock' : 'bg-heron'}
                `}
                role="switch"
                aria-checked={!card.hideCard}
              >
                <span
                  className={`
                    inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform
                    ${!card.hideCard ? 'translate-x-6' : 'translate-x-1'}
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
