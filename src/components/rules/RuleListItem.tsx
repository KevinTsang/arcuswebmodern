'use client';

import { useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Rule, Scheduler } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { selectSchedulerByTarget } from '@/store/slices/schedulersSlice';
import { useSidePanel } from '@/components/SidePanel';
import { ScheduleEditPanel, type ScheduleMessageTypeOption } from '@/components/schedules';
import type { RuleEntity } from '@/store/entityTypes';

/** Rules are scheduled on the platform "RULES" schedule group (legacy config/schedulers.js). */
const RULE_SCHEDULE = 'RULES';

/** A rule schedule event either enables (Active) or disables (Inactive) the rule. */
const RULE_SCHEDULE_ACTIONS: ScheduleMessageTypeOption[] = [
  { value: Rule.CMD_ENABLE, label: 'Active' },
  { value: Rule.CMD_DISABLE, label: 'Inactive', inactive: true },
];

const RULE_SCHEDULE_INSTRUCTIONS =
  'Rules can be scheduled to run between certain time windows. Click \'Add Event\', then choose when you would like the rule to be active or inactive.';

interface RuleListItemProps {
  rule: RuleEntity;
  onEdit: (rule: RuleEntity) => void;
}

export function RuleListItem({ rule, onEdit }: RuleListItemProps) {
  const dispatch = useAppDispatch();
  const { openRight } = useSidePanel();
  const name = rule[Rule.ATTR_NAME] ?? 'Unnamed Rule';
  const description = rule[Rule.ATTR_DESCRIPTION] ?? '';
  const address = rule[Base.ATTR_ADDRESS];
  const ruleId = rule[Base.ATTR_ID] ?? address;
  const state = rule[Rule.ATTR_STATE];
  const isEnabled = state === Rule.STATE_ENABLED;
  const scheduler = useAppSelector((s) => selectSchedulerByTarget(s, address));
  const scheduledCommands = scheduler?.[Scheduler.ATTR_COMMANDS];
  const isScheduled = !!scheduledCommands
    && typeof scheduledCommands === 'object'
    && Object.keys(scheduledCommands).length > 0;

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

  const handleOpenSchedule = useCallback(() => {
    openRight(
      <ScheduleEditPanel
        targetAddress={address}
        targetName={name}
        scheduleId={RULE_SCHEDULE}
        messageType={Rule.CMD_ENABLE}
        messageTypeOptions={RULE_SCHEDULE_ACTIONS}
        instructions={RULE_SCHEDULE_INSTRUCTIONS}
      />,
      { title: 'Schedule', key: `schedule:${address}` },
    );
  }, [openRight, address, name]);

  return (
    <div data-testid={`rule-row-${ruleId}`} data-enabled={isEnabled} className={`border-b border-heron py-4 ${!isEnabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <h3 data-testid={`rule-name-${ruleId}`} className="text-base font-medium text-swift">{name}</h3>
          {isScheduled && (
            <p data-testid={`rule-scheduled-${ruleId}`} className="text-xs text-peacock mt-0.5">Scheduled</p>
          )}
          {description && (
            <p data-testid={`rule-description-${ruleId}`} className="text-sm text-grouse mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleOpenSchedule}
            data-testid={`rule-schedule-${ruleId}`}
            data-scheduled={isScheduled}
            className={`p-1.5 rounded transition-colors ${
              isScheduled ? 'text-peacock' : 'text-heron hover:text-grouse'
            }`}
            title="Schedule"
            aria-label={`Schedule ${name}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
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
