/**
 * SubsystemTabs — route-driven sub-navigation for a subsystem view
 * (/services/<slug>/<action>), from the tabs in `src/lib/subsystemTabs.ts`.
 */

import Link from 'next/link';
import { SUBSYSTEM_TABS, type SubsystemWithTabs } from '@/lib/subsystemTabs';

interface SubsystemTabsProps {
  slug: SubsystemWithTabs;
  /** The action of the tab being shown. */
  active: string;
  /** Test ids are `<testIdPrefix>-<action>`, e.g. `alarm-tab-status`. */
  testIdPrefix: string;
}

export function SubsystemTabs({ slug, active, testIdPrefix }: SubsystemTabsProps) {
  return (
    <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
      {SUBSYSTEM_TABS[slug].map((tab) => (
        <Link
          key={tab.action}
          href={`/services/${slug}/${tab.action}`}
          data-testid={`${testIdPrefix}-${tab.action}`}
          aria-current={active === tab.action ? 'page' : undefined}
          className={`px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium transition-colors ${
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
