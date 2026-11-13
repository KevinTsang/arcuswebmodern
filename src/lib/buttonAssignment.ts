/**
 * Button / key fob assignment.
 *
 * Buttons and key fobs have no on-device configuration: a button's function
 * is a rule created from a product-specific rule template (e.g.
 * "smartfob-arm-on") whose context names the button and the device. Ported
 * from the legacy assign-buttons / assign-button configurators.
 */

import { Base, Rule, RuleTemplate } from '@arcus/core';
import type { RuleEntity, RuleTemplateEntity } from '@/store/entityTypes';

interface ButtonProduct {
  /** Button names on the device, in display order. */
  buttons: string[];
  /** Prefix of the rule template ids that apply to the product. */
  templatePrefix: string;
  /** Rule context key that holds the device address. */
  contextKey: string;
}

const PRODUCTS: Record<string, ButtonProduct> = {
  // 4 button key fob v3
  '4fcccc': { buttons: ['away', 'home', 'a', 'b'], templatePrefix: 'smartfobgen3-', contextKey: 'smart fob' },
  // 4 button key fob v2
  '4fccbb': { buttons: ['circle', 'diamond', 'square', 'hexagon'], templatePrefix: 'smartfob-', contextKey: 'smart fob' },
  // 2 button key fob
  '486390': { buttons: ['away', 'home'], templatePrefix: 'smartfobgen1-', contextKey: 'key fob' },
  // 1 button buttons
  bbf1cf: { buttons: ['button'], templatePrefix: 'button-', contextKey: 'button' },
  bca135: { buttons: ['button'], templatePrefix: 'button-', contextKey: 'button' },
};

interface ButtonAction {
  description: string;
  hint: string;
  weight: number;
}

/** Keyed by the template id suffix after the product prefix. */
const ACTIONS: Record<string, ButtonAction> = {
  panic: { description: 'Trigger Panic Alarm', hint: 'Trigger Panic', weight: -1 },
  'arm-on': { description: 'Set Security Alarm To On', hint: 'Alarm On', weight: 0 },
  disarm: { description: 'Set Security Alarm To Off', hint: 'Alarm Off', weight: 1 },
  'arm-partial': { description: 'Set Security Alarm To Partial', hint: 'Alarm Partial', weight: 2 },
  chime: { description: 'Play Chime', hint: 'Chime', weight: 3 },
};

/** Shown when no template rule is assigned; the button is free for the user's own rules. */
export const UNASSIGNED_DESCRIPTION = 'Activate A Rule';

export interface ButtonActionOption {
  /** Rule template id (base:id). */
  id: string;
  /** Rule template address, target of ruletmpl:CreateRule. */
  address: string;
  /** Rule template name, used as the new rule's name. */
  name: string;
  description: string;
  hint: string;
  weight: number;
}

export function getButtonProduct(productId: string | undefined): ButtonProduct | null {
  return (productId && PRODUCTS[productId]) || null;
}

/** "away" → "Away"; a single-button device's "button" has no label of its own. */
export function formatButtonLabel(button: string): string {
  if (button === 'button') return 'Button';
  return button.charAt(0).toUpperCase() + button.slice(1);
}

/** The product's button actions, from the rule template catalog, in legacy order. */
export function getButtonActionOptions(
  productId: string | undefined,
  templates: RuleTemplateEntity[],
): ButtonActionOption[] {
  const product = getButtonProduct(productId);
  if (!product) return [];
  const options: ButtonActionOption[] = [];
  for (const t of templates) {
    const id = (t[Base.ATTR_ID] as string | undefined) ?? '';
    if (!id.startsWith(product.templatePrefix)) continue;
    const action = ACTIONS[id.slice(product.templatePrefix.length)];
    if (!action) continue;
    options.push({
      id,
      address: t[Base.ATTR_ADDRESS],
      name: t[RuleTemplate.ATTR_NAME] ?? action.description,
      ...action,
    });
  }
  return options.sort((a, b) => a.weight - b.weight);
}

/**
 * The rule that assigns `button` on the device, if any. Only rules created
 * from one of the button's own templates count, so a custom rule that merely
 * mentions the device is never replaced or deleted.
 */
export function findButtonRule(
  rules: RuleEntity[],
  deviceAddress: string,
  button: string,
  options: ButtonActionOption[],
): RuleEntity | undefined {
  const templateIds = new Set(options.map((o) => o.id));
  return rules.find((rule) => {
    const template = rule[Rule.ATTR_TEMPLATE];
    if (!template || !templateIds.has(template)) return false;
    const context = (rule[Rule.ATTR_CONTEXT] ?? {}) as Record<string, string | undefined>;
    const mentionsDevice = Object.values(context).includes(deviceAddress);
    // `button` is the button name for fobs, or the device address for single buttons
    return mentionsDevice && (context.button === button || context.button === deviceAddress);
  });
}

/** Rule context for a new button rule. */
export function buildButtonRuleContext(
  productId: string | undefined,
  deviceAddress: string,
  button: string,
): Record<string, string> {
  const product = getButtonProduct(productId);
  return product ? { button, [product.contextKey]: deviceAddress } : { button };
}
