'use client';

import { useCallback } from 'react';
import { Base } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useSidePanel } from '@/components/SidePanel';
import type { RuleEntity, RuleTemplateEntity } from '@/store/entityTypes';
import { findRuleTemplate, resolveRuleSelectors } from './resolveRuleSelectors';
import { RulePanel } from './RulePanel';

interface OpenRulePanelArgs {
  /** The rule to edit. */
  rule?: RuleEntity;
  /** The template to create a rule from. */
  template?: RuleTemplateEntity;
}

/**
 * Returns a callback that opens the rule editor, editing `rule` or creating a
 * rule from `template`. It starts resolving the template's selectors first, so
 * the panel suspends until they arrive.
 */
export function useOpenRulePanel(): (args: OpenRulePanelArgs) => void {
  const placeId = useAppSelector((s) => s.place.placeId) ?? '';
  const ruleTemplates = useAppSelector((s) => s.rules.ruleTemplates);
  const dispatch = useAppDispatch();
  const { openRight } = useSidePanel();

  return useCallback(
    ({ rule, template }: OpenRulePanelArgs) => {
      const templateAddress = findRuleTemplate(rule, template, ruleTemplates)?.[Base.ATTR_ADDRESS];
      const selectors = resolveRuleSelectors(templateAddress, placeId, dispatch);
      openRight(
        <RulePanel rule={rule} template={template} placeId={placeId} selectors={selectors} />,
        {
          title: rule ? 'Edit Rule' : 'Create Rule',
          key: `rule:${rule?.[Base.ATTR_ADDRESS] ?? `new:${templateAddress ?? ''}`}`,
        },
      );
    },
    [placeId, ruleTemplates, dispatch, openRight],
  );
}
