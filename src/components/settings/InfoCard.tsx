'use client';

import type { ReactNode } from 'react';

export default function InfoCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-pigeon/30">
        <h3 className="text-sm font-medium text-swift">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}
