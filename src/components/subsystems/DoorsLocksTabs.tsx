/**
 * DoorsLocksTabs — route-driven sub-navigation for Doors & Locks:
 * /services/doors-locks/<status | access-list | more>.
 */

import Link from 'next/link';

export const DOORS_LOCKS_TABS = [
  { action: 'status', label: 'Status' },
  { action: 'access-list', label: 'Access List' },
  { action: 'more', label: 'More' },
] as const;

export type DoorsLocksAction = (typeof DOORS_LOCKS_TABS)[number]['action'];

interface DoorsLocksTabsProps {
  active: DoorsLocksAction;
}

export function DoorsLocksTabs({ active }: DoorsLocksTabsProps) {
  return (
    <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
      {DOORS_LOCKS_TABS.map((tab) => (
        <Link
          key={tab.action}
          href={`/services/doors-locks/${tab.action}`}
          data-testid={`doors-tab-${tab.action}`}
          aria-current={active === tab.action ? 'page' : undefined}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            active === tab.action
              ? 'bg-crane text-swift shadow-sm'
              : 'text-grouse hover:text-coot'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
