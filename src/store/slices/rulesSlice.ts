import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface RuleEntity {
  id: string;
  'base:address': string;
  [key: string]: unknown;
}

const rulesAdapter = createEntityAdapter<RuleEntity>();

const rulesSlice = createSlice({
  name: 'rules',
  initialState: rulesAdapter.getInitialState({
    ruleTemplates: [] as Record<string, unknown>[],
  }),
  reducers: {
    ruleAdded: rulesAdapter.addOne,
    ruleUpdated(state, action: PayloadAction<{ 'base:address': string; [key: string]: unknown }>) {
      const address = action.payload['base:address'];
      const { 'base:address': _, ...changes } = action.payload;
      rulesAdapter.updateOne(state, { id: address, changes });
    },
    ruleRemoved: rulesAdapter.removeOne,
    rulesReceived(state, action: PayloadAction<Array<{ 'base:address': string; [key: string]: unknown }>>) {
      const entities = action.payload.map((r) => ({ ...r, id: r['base:address'] }));
      rulesAdapter.setAll(state, entities);
    },
    rulesClear(state) {
      rulesAdapter.removeAll(state);
      state.ruleTemplates = [];
    },
    setRuleTemplates(state, action: PayloadAction<Record<string, unknown>[]>) {
      state.ruleTemplates = action.payload;
    },
  },
});

export const {
  ruleAdded,
  ruleUpdated,
  ruleRemoved,
  rulesReceived,
  rulesClear,
  setRuleTemplates,
} = rulesSlice.actions;

export const {
  selectAll: selectAllRules,
  selectById: selectRuleByAddress,
} = rulesAdapter.getSelectors((state: RootState) => state.rules);

export default rulesSlice.reducer;
