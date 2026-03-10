import Link from 'next/link';

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
  const header = (
    <div className="flex items-center gap-2">
      <span className={`${icon} text-base text-peacock`} />
      <span className="text-sm font-semibold text-swift">{title}</span>
      {badge}
    </div>
  );

  return (
    <div className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-pigeon/20">
        {href ? (
          <Link href={href} className="hover:underline">
            {header}
          </Link>
        ) : (
          header
        )}
        {href && (
          <Link href={href} className="text-xs text-peacock hover:underline">
            View &rarr;
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
