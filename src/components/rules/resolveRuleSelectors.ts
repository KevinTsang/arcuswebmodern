import Bridge from '@arcus/core/bridge';
import { Base, Rule, RuleTemplate } from '@arcus/core';
import { addNotification } from '@/store/slices/uiSlice';
import type { AppDispatch } from '@/store/store';
import type { RuleEntity, RuleTemplateEntity } from '@/store/entityTypes';
import type { ResolvedSelector } from './RuleSelectorSection';
import type { ResolveResponse, ServerSelector, ServerOptionTuple } from './types';

/** The template a rule panel works from: the one given, or in edit mode the catalog entry for rule:template. */
export function findRuleTemplate(
  rule: RuleEntity | undefined,
  template: RuleTemplateEntity | undefined,
  ruleTemplates: RuleTemplateEntity[],
): RuleTemplateEntity | undefined {
  if (template) return template;
  const templateId = rule?.[Rule.ATTR_TEMPLATE] as string | undefined;
  if (!templateId) return undefined;
  return ruleTemplates.find((t) => t[Base.ATTR_ID] === templateId);
}

/**
 * Resolves the template's selectors (the options for each ${variable}) for the
 * place. Never rejects: without a template it resolves to none, and a failure
 * dispatches an error notification and resolves to none, so a rule can still
 * be renamed.
 */
export async function resolveRuleSelectors(
  templateAddress: string | undefined,
  placeId: string,
  dispatch: AppDispatch,
): Promise<Record<string, ResolvedSelector>> {
  if (!templateAddress) return {};
  try {
    const result = await Bridge.request<ResolveResponse>(RuleTemplate.CMD_RESOLVE, templateAddress, { placeId });
    // Server may return selectors under a 'selectors' key or directly at the top level
    const selectorMap = result.selectors ?? (result as Record<string, ServerSelector>);
    const parsed: Record<string, ResolvedSelector> = {};
    for (const [key, sel] of Object.entries(selectorMap)) {
      if (!sel || typeof sel !== 'object' || !('options' in sel)) continue;
      const rawOptions = sel.options ?? [];
      const options = rawOptions.map((tuple: ServerOptionTuple) => ({
        name: tuple[0] ?? '',
        value: tuple[1] ?? tuple[0] ?? '',
      }));
      parsed[key] = {
        type: sel.type ?? 'LIST',
        name: sel.name ?? key,
        options,
      };
    }
    return parsed;
  } catch {
    dispatch(addNotification({ type: 'error', message: 'Failed to resolve rule template' }));
    return {};
  }
}
