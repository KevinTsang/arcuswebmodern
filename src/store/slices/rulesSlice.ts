import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Base } from '@arcus/core';
import type { RuleEntity, ArcusPayload } from '../entityTypes';

export type { RuleEntity } from '../entityTypes';

const rulesAdapter = createEntityAdapter<RuleEntity>();

const rulesSlice = createSlice({
  name: 'rules',
  initialState: rulesAdapter.getInitialState({
    ruleTemplates: [] as Record<string, unknown>[],
  }),
  reducers: {
    ruleAdded: rulesAdapter.addOne,
    ruleUpdated(state, action: PayloadAction<ArcusPayload>) {
      const address = action.payload[Base.ATTR_ADDRESS];
      const { [Base.ATTR_ADDRESS]: _, ...changes } = action.payload;
      rulesAdapter.updateOne(state, { id: address, changes });
    },
    ruleRemoved: rulesAdapter.removeOne,
    rulesReceived(state, action: PayloadAction<ArcusPayload[]>) {
      const entities = action.payload.map((r) => ({ ...r, id: r[Base.ATTR_ADDRESS] }));
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
