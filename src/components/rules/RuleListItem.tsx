import { useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Rule } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import type { RuleEntity } from '@/store/entityTypes';

interface RuleListItemProps {
  rule: RuleEntity;
  onEdit: (rule: RuleEntity) => void;
}

export function RuleListItem({ rule, onEdit }: RuleListItemProps) {
  const dispatch = useAppDispatch();
  const name = rule[Rule.ATTR_NAME] ?? 'Unnamed Rule';
  const description = rule[Rule.ATTR_DESCRIPTION] ?? '';
  const address = rule[Base.ATTR_ADDRESS];
  const ruleId = rule[Base.ATTR_ID] ?? address;
  const state = rule[Rule.ATTR_STATE];
  const isEnabled = state === Rule.STATE_ENABLED;

  const handleToggle = useCallback(async () => {
    try {
      if (isEnabled) {
        await Bridge.request(Rule.CMD_DISABLE, address, {});
      } else {
        await Bridge.request(Rule.CMD_ENABLE, address, {});
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to ${isEnabled ? 'disable' : 'enable'} rule` }));
    }
  }, [address, isEnabled, dispatch]);

  return (
    <div data-testid={`rule-row-${ruleId}`} data-enabled={isEnabled} className={`border-b border-heron py-4 ${!isEnabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <h3 data-testid={`rule-name-${ruleId}`} className="text-base font-medium text-swift">{name}</h3>
          {description && (
            <p data-testid={`rule-description-${ruleId}`} className="text-sm text-grouse mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleToggle}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${isEnabled ? 'bg-peacock' : 'bg-heron'}
            `}
            role="switch"
            aria-checked={isEnabled}
            data-testid={`rule-toggle-${ruleId}`}
          >
            <span
              className={`
                inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform
                ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          <button
            onClick={() => onEdit(rule)}
            data-testid={`rule-edit-${ruleId}`}
            className="text-sm text-peacock hover:underline"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
