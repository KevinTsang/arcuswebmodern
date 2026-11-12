import { renderHook } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Base, Rule, RuleTemplate } from '@arcus/core';
import { useOpenRulePanel } from '@/components/rules/useOpenRulePanel';
import type { RuleEntity, RuleTemplateEntity } from '@/store/entityTypes';
import { makeRule } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
const mockDispatch = jest.fn();
const mockResolveRuleSelectors = jest.fn();

const TEMPLATE: RuleTemplateEntity = {
  id: 'SERV:ruletmpl:button-chime',
  [Base.ATTR_ADDRESS]: 'SERV:ruletmpl:button-chime',
  [Base.ATTR_ID]: 'button-chime',
  [RuleTemplate.ATTR_NAME]: 'Chime on Button Press',
};

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ place: { placeId: 'place-1' }, rules: { ruleTemplates: [TEMPLATE] } }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/components/rules/resolveRuleSelectors', () => ({
  ...jest.requireActual('@/components/rules/resolveRuleSelectors'),
  resolveRuleSelectors: (...args: unknown[]) => mockResolveRuleSelectors(...args),
}));

jest.mock('@/components/rules/RulePanel', () => ({
  RulePanel: () => null,
}));

// ── Helpers ───────────────────────────────────────────────────────────

interface OpenedPanelProps {
  rule?: RuleEntity;
  template?: RuleTemplateEntity;
  placeId: string;
  selectors: Promise<unknown>;
}

const openedPanel = () => (mockOpenRight.mock.calls[0][0] as ReactElement<OpenedPanelProps>).props;

const SELECTORS = Promise.resolve({});

beforeEach(() => {
  jest.clearAllMocks();
  mockResolveRuleSelectors.mockReturnValue(SELECTORS);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useOpenRulePanel', () => {
  it('opens Create Rule, resolving the given template', () => {
    const { result } = renderHook(() => useOpenRulePanel());
    result.current({ template: TEMPLATE });
    expect(mockResolveRuleSelectors).toHaveBeenCalledWith('SERV:ruletmpl:button-chime', 'place-1', mockDispatch);
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), {
      title: 'Create Rule',
      key: 'rule:new:SERV:ruletmpl:button-chime',
    });
    expect(openedPanel()).toEqual({ rule: undefined, template: TEMPLATE, placeId: 'place-1', selectors: SELECTORS });
  });

  it("opens Edit Rule, resolving the catalog template for the rule's template id", () => {
    const rule = makeRule('SERV:rule:place-1.1', { [Rule.ATTR_TEMPLATE]: 'button-chime' });
    const { result } = renderHook(() => useOpenRulePanel());
    result.current({ rule });
    expect(mockResolveRuleSelectors).toHaveBeenCalledWith('SERV:ruletmpl:button-chime', 'place-1', mockDispatch);
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Edit Rule', key: 'rule:SERV:rule:place-1.1' });
    expect(openedPanel()).toMatchObject({ rule, placeId: 'place-1', selectors: SELECTORS });
  });

  it('opens with no template to resolve when the rule template is not in the catalog', () => {
    const rule = makeRule('SERV:rule:place-1.1', { [Rule.ATTR_TEMPLATE]: 'retired-template' });
    const { result } = renderHook(() => useOpenRulePanel());
    result.current({ rule });
    expect(mockResolveRuleSelectors).toHaveBeenCalledWith(undefined, 'place-1', mockDispatch);
  });
});
