'use client';

export default function PersonRow({
  name,
  email,
  role,
  onEdit,
  testId,
}: {
  name: string;
  email: string;
  role?: string;
  onEdit?: () => void;
  /** `data-testid` for the row (e.g. `person-<id>`). */
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="flex items-center justify-between px-3 py-2 rounded border border-heron">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-peacock/10 text-peacock flex items-center justify-center text-sm font-medium flex-shrink-0">
          {(name[0] ?? '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-swift truncate">{name}</p>
          {email && <p className="text-xs text-grouse truncate">{email}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {role && (
          <span className="text-xs text-grouse capitalize">{role}</span>
        )}
        {onEdit && (
          <button onClick={onEdit} data-testid={testId ? `${testId}-details` : undefined} className="text-xs text-peacock hover:underline">
            Details
          </button>
        )}
      </div>
    </div>
  );
}
