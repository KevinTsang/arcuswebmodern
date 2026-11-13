'use client';

/**
 * CareBehaviorRow — one of the place's care behaviors: its name, a summary
 * of its settings, an enable/disable switch and an Edit button.
 */

import { ControlSwitch } from '@/components/shared/ControlSwitch';
import { summarizeField, type CareTemplate } from '@/lib/careBehaviors';
import type { CareBehavior } from '@/store/entityTypes';

interface CareBehaviorRowProps {
  behavior: CareBehavior;
  template: CareTemplate | undefined;
  /** True while this behavior's enable/disable request is in flight. */
  toggling: boolean;
  onToggle: (behavior: CareBehavior, enabled: boolean) => void;
  onEdit: (behavior: CareBehavior) => void;
}

export function CareBehaviorRow({ behavior, template, toggling, onToggle, onEdit }: CareBehaviorRowProps) {
  const id = behavior.id ?? '';
  const name = behavior.name ?? template?.name ?? 'Care Behavior';
  const enabled = behavior.enabled !== false;
  const summary = template
    ? template.fields.map((f) => summarizeField(behavior, f, template)).filter(Boolean).join(' · ')
    : '';

  return (
    <div
      data-testid={`care-behavior-row-${id}`}
      data-enabled={enabled}
      className={`flex items-center gap-3 border border-heron rounded-[var(--border-radius-base)] p-4 ${enabled ? '' : 'opacity-60'}`}
    >
      <div className="flex-1 min-w-0">
        <h4 data-testid={`care-behavior-name-${id}`} className="text-sm font-medium text-swift truncate">{name}</h4>
        {template && template.name !== name && (
          <p className="text-xs text-grouse mt-0.5">{template.name}</p>
        )}
        {summary && (
          <p data-testid={`care-behavior-summary-${id}`} className="text-xs text-grouse mt-0.5">{summary}</p>
        )}
      </div>
      <ControlSwitch
        checked={enabled}
        onChange={(checked) => onToggle(behavior, checked)}
        disabled={toggling}
        testId={`care-behavior-toggle-${id}`}
      />
      <button
        type="button"
        data-testid={`care-behavior-edit-${id}`}
        onClick={() => onEdit(behavior)}
        className="text-sm border border-heron px-3 py-1 rounded-[var(--border-radius-base)] text-coot hover:bg-pigeon"
      >
        Edit
      </button>
    </div>
  );
}
