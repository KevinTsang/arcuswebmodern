import reducer, {
  ruleAdded,
  ruleUpdated,
  ruleRemoved,
  rulesReceived,
  rulesClear,
  setRuleTemplates,
} from '@/store/slices/rulesSlice';

function makeRule(address: string, extra: Record<string, unknown> = {}) {
  return { id: address, 'base:address': address, ...extra };
}

describe('rulesSlice', () => {
  it('returns empty initial state with empty ruleTemplates', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
    expect(state.ruleTemplates).toEqual([]);
  });

  it('ruleAdded adds one rule', () => {
    const state = reducer(undefined, ruleAdded(makeRule('SERV:rule:r1', { 'rule:name': 'Night Lock' })));
    expect(state.ids).toEqual(['SERV:rule:r1']);
    expect(state.entities['SERV:rule:r1']?.['rule:name']).toBe('Night Lock');
  });

  it('ruleUpdated updates an existing rule', () => {
    let state = reducer(undefined, ruleAdded(makeRule('SERV:rule:r1', { 'rule:name': 'Old' })));
    state = reducer(state, ruleUpdated({ 'base:address': 'SERV:rule:r1', 'rule:name': 'Updated' }));
    expect(state.entities['SERV:rule:r1']?.['rule:name']).toBe('Updated');
  });

  it('ruleRemoved removes a rule', () => {
    let state = reducer(undefined, ruleAdded(makeRule('SERV:rule:r1')));
    state = reducer(state, ruleAdded(makeRule('SERV:rule:r2')));
    state = reducer(state, ruleRemoved('SERV:rule:r1'));
    expect(state.ids).toEqual(['SERV:rule:r2']);
  });

  it('rulesReceived replaces all rules', () => {
    let state = reducer(undefined, ruleAdded(makeRule('SERV:rule:old')));
    state = reducer(
      state,
      rulesReceived([
        { 'base:address': 'SERV:rule:a', 'rule:name': 'A' },
        { 'base:address': 'SERV:rule:b', 'rule:name': 'B' },
      ]),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['SERV:rule:old']).toBeUndefined();
  });

  it('rulesClear empties rules and templates', () => {
    let state = reducer(undefined, ruleAdded(makeRule('SERV:rule:r1')));
    state = reducer(state, setRuleTemplates([{ id: 't1' }]));
    state = reducer(state, rulesClear());
    expect(state.ids).toEqual([]);
    expect(state.ruleTemplates).toEqual([]);
  });

  it('setRuleTemplates stores templates', () => {
    const templates = [{ id: 'tmpl1', name: 'Template 1' }];
    const state = reducer(undefined, setRuleTemplates(templates));
    expect(state.ruleTemplates).toEqual(templates);
  });
});
