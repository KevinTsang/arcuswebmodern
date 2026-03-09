import { useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

interface RuleListItemProps {
  rule: Record<string, unknown>;
  onEdit: (rule: Record<string, unknown>) => void;
}

export function RuleListItem({ rule, onEdit }: RuleListItemProps) {
  const dispatch = useAppDispatch();
  const name = (rule['rule:name'] as string) ?? 'Unnamed Rule';
  const description = (rule['rule:description'] as string) ?? '';
  const address = rule['base:address'] as string;
  const state = rule['rule:state'] as string;
  const isEnabled = state === 'ENABLED';

  const handleToggle = useCallback(async () => {
    try {
      if (isEnabled) {
        await Bridge.request('rule:Disable', address, {});
      } else {
        await Bridge.request('rule:Enable', address, {});
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to ${isEnabled ? 'disable' : 'enable'} rule` }));
    }
  }, [address, isEnabled, dispatch]);

  return (
    <div className={`border-b border-heron py-4 ${!isEnabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="text-base font-medium text-swift">{name}</h3>
          {description && (
            <p className="text-sm text-grouse mt-1">{description}</p>
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
            className="text-sm text-peacock hover:underline"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
