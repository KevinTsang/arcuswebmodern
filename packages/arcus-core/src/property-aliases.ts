/**
 * Property aliases for objects sent/received from the Arcus platform.
 *
 * Rules contain properties that conflict with reserved names (like 'on').
 * These transforms rename 'on' ↔ 'ON' in rule contexts.
 *
 * Ported from src/cornea/property-aliases.js.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PropertyAliasMap {
  alias: Record<string, (obj: any) => void>;
  unalias: Record<string, (obj: any) => void>;
}

const propertyAliases: PropertyAliasMap = {
  alias: {
    'rule base:Added'(o: any) {
      if (o['rule:context']?.on) {
        o['rule:context'].ON = o['rule:context'].on;
        delete o['rule:context'].on;
      }
    },
    'rule base:ValueChange'(o: any) {
      if (o['rule:context']?.on) {
        o['rule:context'].ON = o['rule:context'].on;
        delete o['rule:context'].on;
      }
    },
    'rule:ListRuleTemplates'(obj: any) {
      obj.ruleTemplates.forEach((o: any) => {
        o['ruletmpl:template'] = o['ruletmpl:template'].replace(
          /(\${on})/g,
          '${ON}',
        );
      });
    },
    'rule:ListRules'(obj: any) {
      obj.rules.forEach((o: any) => {
        if (o['rule:context'].on) {
          o['rule:context'].ON = o['rule:context'].on;
          delete o['rule:context'].on;
        }
      });
    },
    'ruletmpl:Resolve'(obj: any) {
      if (obj.selectors?.on) {
        obj.selectors.ON = obj.selectors.on;
        delete obj.selectors.on;
      }
    },
  },
  unalias: {
    'rule:UpdateContext'(obj: any) {
      if (obj.ON) {
        obj.on = obj.ON;
        delete obj.ON;
      }
    },
    'ruletmpl:CreateRule'(obj: any) {
      if (obj.ON) {
        obj.on = obj.ON;
        delete obj.ON;
      }
    },
  },
};

export default propertyAliases;
