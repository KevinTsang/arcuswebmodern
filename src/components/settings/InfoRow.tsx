'use client';

import { testIdSlug } from '@/lib/testId';
import { useTestIdScope } from '@/lib/testIdScope';

export default function InfoRow({ label, value }: { label: string; value: string }) {
  // Inside an InfoCard the id is scoped by the card ("info-card-profile-value-email");
  // standalone rows (detail panels) use "info-value-<label>".
  const card = useTestIdScope();
  const testId = card ? `${card}-value-${testIdSlug(label)}` : `info-value-${testIdSlug(label)}`;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-grouse">{label}</span>
      <span data-testid={testId} className="text-swift">{value}</span>
    </div>
  );
}
