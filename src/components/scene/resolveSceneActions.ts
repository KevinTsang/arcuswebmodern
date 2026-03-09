import Bridge from '@arcus/core/bridge';
import { SceneService } from '@arcus/core/services';
import { SelectorType } from './types';
import type { SelectorDef } from './types';

export interface ResolvedAction {
  id: string;
  name: string;
  satisfiable: boolean;
  typehint?: string;
  selectors: Record<string, SelectorDef[]>;
}

interface SceneTemplate {
  'base:address': string;
  'base:id': string;
  'scenetmpl:custom'?: boolean;
  'scenetmpl:name'?: string;
  [key: string]: unknown;
}

export interface ResolveResult {
  actions: ResolvedAction[];
  templateAddress: string;
}

/**
 * Transforms a raw selector from the server's tuple format into our SelectorDef format.
 *
 * Server formats:
 * - GROUP: { type: "GROUP", name: "switch", value: [["ON", [...sub-selectors]], ["OFF", [...sub-selectors]]] }
 * - LIST:  { type: "LIST", name: "fanspeed", value: [["Low", "LOW"], ["Medium", "MED"]] }
 * - Others (PERCENT, RANGE, BOOLEAN, TEMPERATURE, THERMOSTAT, DURATION): pass through as-is
 */
function transformSelector(raw: Record<string, unknown>): SelectorDef {
  const type = (raw['type'] as string) ?? '';
  const name = (raw['name'] as string) ?? '';
  const base: SelectorDef = { type, name };

  // Copy numeric fields if present
  if (raw['min'] != null) base.min = Number(raw['min']);
  if (raw['max'] != null) base.max = Number(raw['max']);
  if (raw['step'] != null) base.step = Number(raw['step']);

  const value = raw['value'];

  if (type === SelectorType.GROUP && Array.isArray(value)) {
    // GROUP tuples: [[optionValue, [sub-selector-objects]], ...]
    base.options = value.map((tuple: unknown) => {
      if (!Array.isArray(tuple)) return { label: String(tuple), value: String(tuple) };
      const optValue = String(tuple[0] ?? '');
      const subRaw = Array.isArray(tuple[1]) ? tuple[1] as Array<Record<string, unknown>> : [];
      return {
        label: optValue,
        value: optValue,
        selectors: subRaw.map(transformSelector),
      };
    });
  } else if (type === SelectorType.LIST && Array.isArray(value)) {
    // LIST tuples: [[label, value], ...]
    base.options = value.map((tuple: unknown) => {
      if (!Array.isArray(tuple)) return { label: String(tuple), value: String(tuple) };
      return {
        label: String(tuple[0] ?? ''),
        value: String(tuple[1] ?? tuple[0] ?? ''),
      };
    });
  } else {
    // PERCENT, RANGE, BOOLEAN, TEMPERATURE, THERMOSTAT, DURATION, etc.
    base.value = value;
  }

  return base;
}

function transformSelectors(raw: Record<string, unknown[]>): Record<string, SelectorDef[]> {
  const result: Record<string, SelectorDef[]> = {};
  for (const [deviceAddr, selectors] of Object.entries(raw)) {
    if (!Array.isArray(selectors)) continue;
    result[deviceAddr] = selectors.map((s) => transformSelector(s as Record<string, unknown>));
  }
  return result;
}

/**
 * Resolves available scene actions for a given place and template.
 *
 * Mirrors the arcusweb flow:
 * 1. Call ListSceneTemplates to get available templates for the place
 * 2. Find the target template (custom for new scenes, or matching scene:template for editing)
 * 3. Call ResolveActions on that template to get available actions with selectors
 */
export async function resolveSceneActions(
  placeId: string,
  templateId?: string,
): Promise<ResolveResult> {
  // Step 1: List available templates (mirrors arcusweb scenes.js place setter)
  const templatesResult = await SceneService.ListSceneTemplates(placeId);
  const templates = (templatesResult as Record<string, unknown>)['sceneTemplates'] as SceneTemplate[] | undefined;

  if (!templates || templates.length === 0) {
    throw new Error('No scene templates available');
  }

  // Step 2: Find the target template
  let template: SceneTemplate | undefined;
  if (templateId) {
    template = templates.find((t) => t['base:id'] === templateId);
  }
  // Fall back to the custom template (used for new scenes and as default)
  if (!template) {
    template = templates.find((t) => t['scenetmpl:custom'] === true)
      ?? templates.find((t) => t['base:address'] === 'SERV:scenetmpl:custom');
  }

  if (!template) {
    throw new Error('Custom scene template not found');
  }

  const templateAddress = template['base:address'];

  // Step 3: Resolve actions for this template (mirrors SceneTemplate.ResolveActions)
  const result = await Bridge.request('scenetmpl:ResolveActions', templateAddress, { placeId });
  const raw = (result as Record<string, unknown>)['actions'] as Array<Record<string, unknown>> | undefined;

  const actions: ResolvedAction[] = (raw ?? []).map((a) => ({
    id: (a['id'] as string) ?? '',
    name: (a['name'] as string) ?? '',
    satisfiable: a['satisfiable'] !== false,
    typehint: a['typehint'] as string | undefined,
    selectors: a['selectors'] ? transformSelectors(a['selectors'] as Record<string, unknown[]>) : {},
  }));

  actions.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return { actions, templateAddress };
}
