import Bridge from '../bridge';

const RuleService = {
  ListRuleTemplates(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('rule:ListRuleTemplates', 'SERV:rule:', { placeId });
  },

  ListRules(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('rule:ListRules', 'SERV:rule:', { placeId });
  },

  GetCategories(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('rule:GetCategories', 'SERV:rule:', { placeId });
  },

  GetRuleTemplatesByCategory(placeId: string, category: string): Promise<Record<string, unknown>> {
    return Bridge.request('rule:GetRuleTemplatesByCategory', 'SERV:rule:', { placeId, category });
  },
};

export default RuleService;
