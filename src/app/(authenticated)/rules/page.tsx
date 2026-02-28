'use client';

/**
 * Rules page — ported from src/pages/rules/.
 *
 * Two views: "My Rules" (active rules with enable/disable) and
 * "Rules Library" (browse templates by category to add new rules).
 */

import { useState, useCallback, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllRules } from '@/store/slices/rulesSlice';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';

type ViewMode = 'my' | 'library';

// ── Rule List Item ────────────────────────────────────────────────────

function RuleListItem({
  rule,
  onEdit,
}: {
  rule: Record<string, unknown>;
  onEdit: (rule: Record<string, unknown>) => void;
}) {
  const dispatch = useAppDispatch();
  const name = (rule['rule:name'] as string) ?? 'Unnamed Rule';
  const description = (rule['rule:description'] as string) ?? '';
  const address = rule['base:address'] as string;
  const state = rule['rule:state'] as string;
  const isEnabled = state === 'ENABLED';

  const handleToggle = useCallback(async () => {
    try {
      if (isEnabled) {
        await Bridge.request('rule:Disable', address, {});
      } else {
        await Bridge.request('rule:Enable', address, {});
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to ${isEnabled ? 'disable' : 'enable'} rule` }));
    }
  }, [address, isEnabled, dispatch]);

  return (
    <div className={`border-b border-heron py-4 ${!isEnabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="text-base font-medium text-swift">{name}</h3>
          {description && (
            <p className="text-sm text-grouse mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Toggle switch */}
          <button
            onClick={handleToggle}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${isEnabled ? 'bg-peacock' : 'bg-heron'}
            `}
            role="switch"
            aria-checked={isEnabled}
          >
            <span
              className={`
                inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform
                ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="text-sm text-peacock hover:underline"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rule Edit Panel ───────────────────────────────────────────────────

function RuleEditPanel({ rule }: { rule: Record<string, unknown> }) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const [name, setName] = useState((rule['rule:name'] as string) ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const address = rule['base:address'] as string;

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await Bridge.request('base:SetAttributes', address, { 'rule:name': name.trim() });
      dispatch(addNotification({ type: 'success', message: 'Rule saved' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save rule' }));
    }
    setSaving(false);
  }, [address, name, dispatch, closeRight]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await Bridge.request('rule:Delete', address, {});
      dispatch(addNotification({ type: 'success', message: 'Rule deleted' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete rule' }));
    }
    setDeleting(false);
  }, [address, dispatch, closeRight]);

  return (
    <div>
      <h3 className="text-lg font-semibold text-swift mb-4">Edit Rule</h3>

      <div className="mb-4">
        <label htmlFor="ruleName" className="block text-sm font-medium text-swift mb-1">
          Rule Name
        </label>
        <input
          id="ruleName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
        />
      </div>

      <p className="text-sm text-grouse mb-6">
        Full rule template editing will be available in a future update.
      </p>

      <div className="flex gap-3 mb-8">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] hover:opacity-90 disabled:opacity-50 text-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={closeRight}
          className="border border-heron text-coot px-5 py-2 rounded-[var(--border-radius-base)] hover:bg-pigeon text-sm"
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
          Delete Rule
        </button>
      ) : (
        <div>
          <p className="text-sm text-swift mb-3">Are you sure you want to delete this rule?</p>
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

// ── Rules Library (Template Categories) ───────────────────────────────

function RulesLibrary() {
  const ruleTemplates = useAppSelector((s) => s.rules.ruleTemplates);

  // Group templates by category
  const categories = useMemo(() => {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const tmpl of ruleTemplates) {
      const cats = tmpl['ruletmpl:categories'] as string[] | undefined;
      if (cats) {
        for (const cat of cats) {
          const list = map.get(cat) ?? [];
          list.push(tmpl);
          map.set(cat, list);
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [ruleTemplates]);

  const [openCategory, setOpenCategory] = useState<string | null>(null);

  if (ruleTemplates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-grouse">No rule templates available.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-grouse mb-4">
        Browse rule templates by category. Full rule creation with template configuration
        will be available in a future update.
      </p>
      <div className="space-y-1">
        {categories.map(([category, templates]) => (
          <div key={category} className="border border-heron rounded-[var(--border-radius-base)]">
            <button
              onClick={() => setOpenCategory(openCategory === category ? null : category)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-pigeon transition-colors"
            >
              <span className="font-medium text-swift">{category}</span>
              <span className="text-sm text-grouse">
                {templates.length} template{templates.length !== 1 ? 's' : ''}
                <span className="ml-2">{openCategory === category ? '\u25B2' : '\u25BC'}</span>
              </span>
            </button>
            {openCategory === category && (
              <div className="border-t border-heron px-4 py-2">
                {templates.map((tmpl, i) => (
                  <div key={i} className="py-2 border-b border-pigeon last:border-b-0">
                    <p className="text-sm text-swift">
                      {(tmpl['ruletmpl:name'] as string) ?? 'Unnamed template'}
                    </p>
                    {tmpl['ruletmpl:description'] ? (
                      <p className="text-xs text-grouse mt-0.5">
                        {String(tmpl['ruletmpl:description'])}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────

export default function RulesPage() {
  const [view, setView] = useState<ViewMode>('my');
  const rules = useAppSelector(selectAllRules);
  const placeName = useAppSelector(
    (s) => (s.place.place?.['place:name'] as string) ?? 'Your Home',
  );
  const { openRight } = useSidePanel();

  const handleEdit = useCallback(
    (rule: Record<string, unknown>) => {
      openRight(<RuleEditPanel rule={rule} />);
    },
    [openRight],
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
        <RulesLibrary />
      )}
    </div>
  );
}
