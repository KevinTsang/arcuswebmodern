'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Rule, RuleTemplate } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { RuleSelectorSection } from './RuleSelectorSection';
import type { ResolvedSelector } from './RuleSelectorSection';
import type { ResolveResponse, ServerSelector, ServerOptionTuple } from './types';
import type { RuleEntity, RuleTemplateEntity } from '@/store/entityTypes';

type TemplateSegment = { type: 'text'; text: string } | { type: 'variable'; text: string; name: string };

export function parseTemplateString(template: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  const regex = /\$\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: template.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'variable', text: match[1], name: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < template.length) {
    segments.push({ type: 'text', text: template.slice(lastIndex) });
  }
  return segments;
}

/**
 * Fill each ${variable} with the name of its selected option. Returns undefined when there is
 * no template text or any variable has no selected, named option (Resolve failed, a selection
 * is empty, or the variable is one this panel cannot pick), so a saved description never ends
 * up blank or holding variable names or raw addresses.
 */
function describeSelections(
  segments: TemplateSegment[],
  selectors: Record<string, ResolvedSelector>,
  context: Record<string, string>,
): string | undefined {
  if (segments.length === 0) return undefined;
  let description = '';
  for (const seg of segments) {
    if (seg.type === 'text') {
      description += seg.text;
      continue;
    }
    const value = context[seg.name];
    const label = value ? selectors[seg.name]?.options.find((o) => o.value === value)?.name : undefined;
    if (!label) return undefined;
    description += label;
  }
  return description;
}

/** The rule's saved selections, without the platform-managed keys (_placeId, _accountId, _ruleName). */
function savedSelections(rule: RuleEntity | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(rule?.[Rule.ATTR_CONTEXT] ?? {})) {
    if (typeof value === 'string' && !key.startsWith('_')) result[key] = value;
  }
  return result;
}

interface RulePanelProps {
  rule?: RuleEntity;
  template?: RuleTemplateEntity;
  placeId: string;
}

export function RulePanel({ rule, template, placeId }: RulePanelProps) {
  const isEdit = !!rule;
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const ruleTemplates = useAppSelector((s) => s.rules.ruleTemplates);

  const address = rule?.[Base.ATTR_ADDRESS] as string | undefined;

  // In edit mode, find the template from the rule's template id
  const resolvedTemplate = useMemo(() => {
    if (template) return template;
    if (!rule) return undefined;
    const templateId = rule[Rule.ATTR_TEMPLATE] as string | undefined;
    if (!templateId) return undefined;
    return ruleTemplates.find((t) => t[Base.ATTR_ID] === templateId);
  }, [template, rule, ruleTemplates]);

  const templateAddress = resolvedTemplate?.[Base.ATTR_ADDRESS] as string | undefined;
  const templateString = (resolvedTemplate?.[RuleTemplate.ATTR_TEMPLATE] as string) ?? '';
  const segments = useMemo(() => parseTemplateString(templateString), [templateString]);

  const [name, setName] = useState(
    isEdit ? ((rule[Rule.ATTR_NAME] as string) ?? '') : ((resolvedTemplate?.[RuleTemplate.ATTR_NAME] as string) ?? ''),
  );
  const [selectors, setSelectors] = useState<Record<string, ResolvedSelector>>({});
  // The rule's saved selections, kept to tell whether the user changed any of them
  const savedContext = useMemo(() => savedSelections(rule), [rule]);
  const [context, setContext] = useState<Record<string, string>>(savedContext);
  const [activeSelector, setActiveSelector] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!templateAddress) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await Bridge.request<ResolveResponse>(RuleTemplate.CMD_RESOLVE, templateAddress, { placeId });
        if (cancelled) return;
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
        setSelectors(parsed);
        // A saved selection that is no longer offered (e.g. a removed device) must be picked again
        setContext((prev) => {
          const next = { ...prev };
          for (const [key, sel] of Object.entries(parsed)) {
            if (next[key] && !sel.options.some((o) => o.value === next[key])) next[key] = '';
          }
          return next;
        });
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to resolve rule template' }));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [templateAddress, placeId, dispatch]);

  const selectorKeys = Object.keys(selectors);
  const missingSelections = selectorKeys.filter((k) => !context[k]);
  // Creating needs every selection. Editing needs every offered selection, but can still
  // rename a rule whose template could not be resolved (no selectors).
  const canSave = !!name.trim() && missingSelections.length === 0 && (isEdit || selectorKeys.length > 0);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    const trimmedName = name.trim();
    const description = describeSelections(segments, selectors, context);
    setSaving(true);
    try {
      if (rule && address) {
        const nameChanged = trimmedName !== rule[Rule.ATTR_NAME];
        const contextChanged = Object.keys(selectors).some((k) => context[k] !== savedContext[k]);
        // Also repairs a description an earlier save left blank or full of addresses
        const newDescription = description !== rule[Rule.ATTR_DESCRIPTION] ? description : undefined;
        // Name first: UpdateContext copies the saved name into the actions' _ruleName
        if (nameChanged) {
          await Bridge.request(Base.CMD_SETATTRIBUTES, address, { [Rule.ATTR_NAME]: trimmedName });
        }
        // The platform merges this into the saved context, so it also re-applies the name when
        // Resolve failed. It rejects a template missing from its catalog; rules.ruleTemplates holds
        // that whole catalog, so UpdateContext is skipped when the template is not there.
        if ((nameChanged || contextChanged) && resolvedTemplate) {
          await Bridge.request(Rule.CMD_UPDATECONTEXT, address, {
            context: { ...context },
            template: resolvedTemplate[Base.ATTR_ID] ?? '',
          });
        }
        // Last, so a failed UpdateContext never leaves a description of selections it did not apply
        if (newDescription !== undefined) {
          await Bridge.request(Base.CMD_SETATTRIBUTES, address, { [Rule.ATTR_DESCRIPTION]: newDescription });
        }
        if (nameChanged || contextChanged || newDescription !== undefined) {
          dispatch(addNotification({ type: 'success', message: 'Rule saved' }));
        }
      } else if (templateAddress) {
        await Bridge.request(RuleTemplate.CMD_CREATERULE, templateAddress, {
          placeId,
          name: trimmedName,
          // Without one the platform uses the template's own description
          ...(description !== undefined ? { description } : {}),
          context: { ...context },
        });
        dispatch(addNotification({ type: 'success', message: 'Rule created' }));
      }
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: isEdit ? 'Failed to save rule' : 'Failed to create rule' }));
    }
    setSaving(false);
  }, [canSave, name, segments, selectors, context, rule, address, savedContext, resolvedTemplate, templateAddress, placeId, isEdit, dispatch, closeRight]);

  const handleDelete = useCallback(async () => {
    if (!address) return;
    setDeleting(true);
    try {
      await Bridge.request(Rule.CMD_DELETE, address, {});
      dispatch(addNotification({ type: 'success', message: 'Rule deleted' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete rule' }));
    }
    setDeleting(false);
  }, [address, dispatch, closeRight]);

  const handleSelect = useCallback((varName: string, value: string) => {
    setContext((prev) => ({ ...prev, [varName]: value }));
  }, []);

  const activeResolvedSelector = activeSelector ? selectors[activeSelector] : null;

  const heading = isEdit ? 'Edit Rule' : 'Create Rule';

  if (loading) {
    return (
      <div>
        <h3 data-testid="rule-panel-title" className="text-lg font-semibold text-swift mb-4">{heading}</h3>
        <p className="text-sm text-grouse">Loading template...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 data-testid="rule-panel-title" className="text-lg font-semibold text-swift mb-4">{heading}</h3>

      <div className="mb-4">
        <label htmlFor="ruleName" className="block text-sm font-medium text-swift mb-1">
          Rule Name
        </label>
        <input
          id="ruleName"
          data-testid="rule-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
        />
      </div>

      {segments.length > 0 && (
        <div className="mb-4 p-4 bg-pigeon rounded-[var(--border-radius-base)]">
          <div className="text-sm text-swift leading-relaxed flex flex-wrap items-center gap-1">
            {segments.map((seg, i) => {
              if (seg.type === 'text') {
                return <span key={i}>{seg.text}</span>;
              }
              const selector = selectors[seg.name];
              const selectedValue = context[seg.name];
              const selectedOption = selector?.options.find(
                (o) => o.value === selectedValue,
              );
              const isActive = activeSelector === seg.name;
              return (
                <button
                  key={i}
                  data-testid={`rule-var-${seg.name}`}
                  onClick={() => setActiveSelector(isActive ? null : seg.name)}
                  className={`
                    px-2 py-0.5 rounded text-sm font-medium border transition-colors
                    ${isActive
                      ? 'bg-peacock text-crane border-peacock'
                      : selectedOption
                        ? 'bg-peacock/10 border-peacock text-peacock'
                        : 'bg-crane border-heron text-grouse hover:border-peacock'}
                  `}
                >
                  {selectedOption ? selectedOption.name : seg.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selector subsection — appears below the template description */}
      {segments.length > 0 && (
        <>
          <hr className="border-heron mb-4" />
          <RuleSelectorSection
            activeSelector={activeSelector}
            selector={activeResolvedSelector}
            selectedValue={activeSelector ? (context[activeSelector] ?? '') : ''}
            onSelect={(value) => activeSelector && handleSelect(activeSelector, value)}
          />
        </>
      )}

      {isEdit && missingSelections.length > 0 && (
        <p data-testid="rule-incomplete" className="text-sm text-cardinal mb-4">
          The rule is incomplete. Please choose a setting for {missingSelections.map((k) => k.toUpperCase()).join(', ')}.
        </p>
      )}

      <div className="flex gap-3 mb-8">
        <button
          onClick={handleSave}
          data-testid="rule-save"
          disabled={saving || !canSave}
          className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] hover:opacity-90 disabled:opacity-50 text-sm"
        >
          {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save' : 'Create Rule')}
        </button>
        <button
          onClick={closeRight}
          className="border border-heron text-coot px-5 py-2 rounded-[var(--border-radius-base)] hover:bg-pigeon text-sm"
        >
          Cancel
        </button>
      </div>

      {isEdit && (
        <>
          <hr className="border-heron mb-4" />

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              data-testid="rule-delete"
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
                  data-testid="rule-delete-confirm"
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
        </>
      )}
    </div>
  );
}
