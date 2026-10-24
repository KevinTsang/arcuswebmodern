'use client';

import { useRouter } from 'next/navigation';
import { subsystemConfigs } from '@/lib/subsystemConfig';

const DEFAULT_ACTION = 'status';

/**
 * Mobile subsystem selector. Client component because changing the selection
 * navigates via the router. The active subsystem is passed in as a prop.
 */
export function MobileSubsystemSelector({ activeSlug }: { activeSlug: string }) {
  const router = useRouter();

  return (
    <div className="md:hidden mb-4 w-full">
      <select
        data-testid="subsystem-select"
        value={activeSlug}
        onChange={(e) => router.push(`/services/${e.target.value}/${DEFAULT_ACTION}`)}
        className="w-full text-sm border border-heron rounded-[var(--border-radius-base)] px-3 py-2 focus:outline-none focus:border-peacock"
      >
        {subsystemConfigs.filter((c) => c.visible).map((config) => (
          <option key={config.slug} value={config.slug}>
            {config.name}
          </option>
        ))}
      </select>
    </div>
  );
}
