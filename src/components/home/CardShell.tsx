import Link from 'next/link';
import { testIdSlug } from '@/lib/testId';
import { TestIdScope } from '@/lib/testIdScope';

export default function CardShell({
  title,
  icon,
  href,
  badge,
  children,
}: {
  title: string;
  icon: string;
  href?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  // transforms title into a slug for test ids, e.g. "Alarm Status" -> "alarm-status"
  const slug = testIdSlug(title);

  const header = (
    <div className="flex items-center gap-2">
      <span className={`${icon} text-base text-peacock`} />
      <span className="text-sm font-semibold text-swift">{title}</span>
      {badge}
    </div>
  );

  return (
    <div
      data-testid={`card-${slug}`}
      className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-pigeon/20">
        {href ? (
          <Link href={href} className="hover:underline">
            {header}
          </Link>
        ) : (
          header
        )}
        {href && (
          <Link
            href={href}
            data-testid={`card-view-link-${slug}`}
            className="text-xs text-peacock hover:underline"
          >
            View &rarr;
          </Link>
        )}
      </div>
      <div className="px-4 py-3">
        <TestIdScope.Provider value={slug}>{children}</TestIdScope.Provider>
      </div>
    </div>
  );
}
