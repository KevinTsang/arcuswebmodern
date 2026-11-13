'use client';

import { useState, useCallback } from 'react';
import { Base, Rule, RuleTemplate } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import type { RuleEntity } from '@/store/entityTypes';
import {
  UNASSIGNED_DESCRIPTION, buildButtonRuleContext, formatButtonLabel, type ButtonActionOption,
} from '@/lib/buttonAssignment';

interface ButtonAssignmentSelectProps {
  deviceAddress: string;
  productId: string | undefined;
  placeId: string | null;
  button: string;
  options: ButtonActionOption[];
  /** The rule currently assigning this button, if any. */
  rule: RuleEntity | undefined;
}

/**
 * The action assigned to one button. Choosing an action creates a rule from
 * its template and then deletes the button's previous rule; choosing
 * "Activate A Rule" only deletes it, freeing the button for the user's own
 * rules.
 */
export function ButtonAssignmentSelect({
  deviceAddress, productId, placeId, button, options, rule,
}: ButtonAssignmentSelectProps) {
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);
  const selected = rule?.[Rule.ATTR_TEMPLATE] ?? '';
  const selectId = `button-assign-${button}`;
  const label = formatButtonLabel(button);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (templateId === selected) return;
    const option = options.find((o) => o.id === templateId);
    setSaving(true);
    try {
      if (option) {
        await Bridge.request(RuleTemplate.CMD_CREATERULE, option.address, {
          placeId,
          name: option.name,
          description: option.name,
          context: buildButtonRuleContext(productId, deviceAddress, button),
        });
      }
      if (rule) {
        await Bridge.request(Rule.CMD_DELETE, rule[Base.ATTR_ADDRESS], {});
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to assign the ${label} button` }));
    }
    setSaving(false);
  }, [selected, options, placeId, productId, deviceAddress, button, rule, label, dispatch]);

  return (
    <div>
      <label htmlFor={selectId} className="block text-xs text-grouse mb-1">{label}</label>
      <select
        id={selectId}
        value={selected}
        onChange={handleChange}
        disabled={saving || !placeId}
        data-testid={selectId}
        className="w-full px-3 py-2 text-sm text-swift bg-crane border border-heron rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.description}</option>
        ))}
        <option value="">{UNASSIGNED_DESCRIPTION}</option>
      </select>
    </div>
  );
}
