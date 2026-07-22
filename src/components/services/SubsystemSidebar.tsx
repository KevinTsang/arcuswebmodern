import Link from 'next/link';
import { subsystemConfigs } from '@/lib/subsystemConfig';

const DEFAULT_ACTION = 'status';

/**
 * Desktop subsystem navigation. The active subsystem is passed in as a prop
 * (the route already knows it), so this stays a plain server component — no
 * pathname parsing, no client hooks.
 */
export function SubsystemSidebar({ activeSlug }: { activeSlug: string }) {
  return (
    <nav className="w-52 flex-shrink-0 hidden md:block">
      <ul className="space-y-0.5">
        {subsystemConfigs.filter((c) => c.visible).map((config) => (
          <li key={config.slug}>
            <Link
              href={`/services/${config.slug}/${DEFAULT_ACTION}`}
              data-testid={`subsystem-nav-${config.slug}`}
              className={`
                w-full text-left px-3 py-2.5 rounded-[var(--border-radius-base)] text-sm transition-colors flex items-center gap-2
                ${activeSlug === config.slug
                  ? 'bg-peacock/10 text-peacock font-medium'
                  : 'text-coot hover:bg-pigeon'}
              `}
            >
              <span className={`${config.icon} text-base`} />
              {config.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
