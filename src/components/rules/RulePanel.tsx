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
  const [context, setContext] = useState<Record<string, string>>(() => {
    if (!rule) return {};
    const ctx = rule[Rule.ATTR_CONTEXT] as Record<string, unknown> | undefined;
    if (!ctx) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(ctx)) {
      if (typeof v === 'string') result[k] = v;
    }
    return result;
  });
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
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to resolve rule template' }));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [templateAddress, placeId, dispatch]);

  const selectorKeys = Object.keys(selectors);
  const allFilled = selectorKeys.length > 0 && selectorKeys.every((k) => context[k]);

  /** Replace ${variable} placeholders with the selected option's display name. */
  const resolveDescription = useCallback((): string => {
    return templateString.replace(/\$\{([^}]+)\}/g, (_match, varName: string) => {
      const value = context[varName];
      if (!value) return varName;
      const option = selectors[varName]?.options.find((o) => o.value === value);
      return option?.name ?? value;
    });
  }, [templateString, context, selectors]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isEdit && address) {
        await Bridge.request(Base.CMD_SETATTRIBUTES, address, {
          [Rule.ATTR_NAME]: name.trim(),
          [Rule.ATTR_DESCRIPTION]: resolveDescription(),
        });
        if (selectorKeys.length > 0) {
          const updateContext: Record<string, string> = {};
          for (const key of selectorKeys) {
            if (context[key]) updateContext[key] = context[key];
          }
          await Bridge.request(Rule.CMD_UPDATECONTEXT, address, {
            context: updateContext,
            template: resolvedTemplate?.[Base.ATTR_ID] ?? '',
          });
        }
        dispatch(addNotification({ type: 'success', message: 'Rule saved' }));
      } else if (templateAddress) {
        if (!allFilled) return;
        await Bridge.request(RuleTemplate.CMD_CREATERULE, templateAddress, {
          placeId,
          name: name.trim(),
          description: resolveDescription(),
          context,
        });
        dispatch(addNotification({ type: 'success', message: 'Rule created' }));
      }
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: isEdit ? 'Failed to save rule' : 'Failed to create rule' }));
    }
    setSaving(false);
  }, [isEdit, address, name, templateAddress, placeId, context, allFilled, selectorKeys, resolvedTemplate, resolveDescription, dispatch, closeRight]);

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

      <div className="flex gap-3 mb-8">
        <button
          onClick={handleSave}
          data-testid="rule-save"
          disabled={saving || !name.trim() || (!isEdit && !allFilled)}
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
