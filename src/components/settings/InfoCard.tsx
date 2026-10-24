'use client';

import type { ReactNode } from 'react';
import { testIdSlug } from '@/lib/testId';
import { TestIdScope } from '@/lib/testIdScope';

export default function InfoCard({
  title,
  action,
  children,
  testId,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  /** Overrides the default `info-card-<title slug>` — pass one when titles can repeat. */
  testId?: string;
}) {
  const cardId = testId ?? `info-card-${testIdSlug(title)}`;
  return (
    <div data-testid={cardId} className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-pigeon/30">
        <h3 className="text-sm font-medium text-swift">{title}</h3>
        <span data-testid={`${cardId}-action`}>{action}</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <TestIdScope.Provider value={cardId}>{children}</TestIdScope.Provider>
      </div>
    </div>
  );
}
