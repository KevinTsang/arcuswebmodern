import reducer, {
  ruleAdded,
  ruleUpdated,
  ruleRemoved,
  rulesReceived,
  rulesClear,
  setRuleTemplates,
} from '@/store/slices/rulesSlice';
import { Base, Rule } from '@arcus/core';
import { makeRule } from '../../helpers/factories';

describe('rulesSlice', () => {
  it('returns empty initial state with empty ruleTemplates', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
    expect(state.ruleTemplates).toEqual([]);
  });

  it('ruleAdded adds one rule', () => {
    const state = reducer(undefined, ruleAdded(makeRule('SERV:rule:r1', { [Rule.ATTR_NAME]: 'Night Lock' })));
    expect(state.ids).toEqual(['SERV:rule:r1']);
    expect(state.entities['SERV:rule:r1']?.[Rule.ATTR_NAME]).toBe('Night Lock');
  });

  it('ruleUpdated updates an existing rule', () => {
    let state = reducer(undefined, ruleAdded(makeRule('SERV:rule:r1', { [Rule.ATTR_NAME]: 'Old' })));
    state = reducer(state, ruleUpdated({ [Base.ATTR_ADDRESS]: 'SERV:rule:r1', [Rule.ATTR_NAME]: 'Updated' }));
    expect(state.entities['SERV:rule:r1']?.[Rule.ATTR_NAME]).toBe('Updated');
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
        { [Base.ATTR_ADDRESS]: 'SERV:rule:a', [Rule.ATTR_NAME]: 'A' },
        { [Base.ATTR_ADDRESS]: 'SERV:rule:b', [Rule.ATTR_NAME]: 'B' },
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

  it('setRuleTemplates stores templates with id from address', () => {
    const templates = [{ [Base.ATTR_ADDRESS]: 'SERV:ruletmpl:tmpl1', name: 'Template 1' }];
    const state = reducer(undefined, setRuleTemplates(templates as any));
    expect(state.ruleTemplates).toEqual([
      { id: 'SERV:ruletmpl:tmpl1', [Base.ATTR_ADDRESS]: 'SERV:ruletmpl:tmpl1', name: 'Template 1' },
    ]);
  });
});
