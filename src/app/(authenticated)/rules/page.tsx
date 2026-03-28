'use client';

/**
 * Rules page — ported from src/pages/rules/.
 *
 * Two views: "My Rules" (active rules with enable/disable) and
 * "Rules Library" (browse templates by category to add new rules).
 */

import { useState, useCallback } from 'react';
import { Place } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllRules } from '@/store/slices/rulesSlice';
import { useSidePanel } from '@/components/SidePanel';
import { RulePanel } from '@/components/rules/RulePanel';
import { RuleListItem } from '@/components/rules/RuleListItem';
import { RulesLibrary } from '@/components/rules/RulesLibrary';

type ViewMode = 'my' | 'library';

// ── Page Component ────────────────────────────────────────────────────

export default function RulesPage() {
  const [view, setView] = useState<ViewMode>('my');
  const rules = useAppSelector(selectAllRules);
  const placeId = useAppSelector((s) => s.place.placeId) ?? '';
  const placeName = useAppSelector(
    (s) => s.place.place?.[Place.ATTR_NAME] ?? 'Your Home',
  );
  const { openRight } = useSidePanel();

  const handleEdit = useCallback(
    (rule: Record<string, unknown>) => {
      openRight(<RulePanel rule={rule} placeId={placeId} />);
    },
    [openRight, placeId],
  );

  return (
    <div className="p-[var(--gutter)]">
      {/* Context bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Rules
        </h2>
        <span className="text-sm text-grouse">{placeName}</span>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 mb-6 bg-pigeon rounded-[var(--border-radius-base)] p-1 w-fit">
        <button
          onClick={() => setView('my')}
          className={`
            px-4 py-1.5 rounded text-sm font-medium transition-colors
            ${view === 'my' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'}
          `}
        >
          My Rules
        </button>
        <button
          onClick={() => setView('library')}
          className={`
            px-4 py-1.5 rounded text-sm font-medium transition-colors
            ${view === 'library' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'}
          `}
        >
          Rules Library
        </button>
      </div>

      {view === 'my' ? (
        rules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-grouse mb-2">No rules configured yet.</p>
            <p className="text-sm text-grouse">
              Rules let you automate actions based on device events and schedules.
            </p>
          </div>
        ) : (
          <div>
            {rules.map((rule) => (
              <RuleListItem key={rule.id} rule={rule} onEdit={handleEdit} />
            ))}
          </div>
        )
      ) : (
        <RulesLibrary placeId={placeId} />
      )}
    </div>
  );
}
