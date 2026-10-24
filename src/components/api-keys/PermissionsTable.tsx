import { useTestIdScope } from '@/lib/testIdScope';
import { PERMISSION_CATEGORIES, isAllPerms, type PermSet } from './permissions';

type PermAction = 'r' | 'w' | 'x' | '*';

/** The checkbox columns, in display order. `*` toggles all three flags. */
const COLUMNS: { action: PermAction; label: string; testId: string }[] = [
  { action: 'r', label: 'Read', testId: 'r' },
  { action: 'w', label: 'Write', testId: 'w' },
  { action: 'x', label: 'Execute', testId: 'x' },
  { action: '*', label: 'All', testId: 'all' },
];

export default function PermissionsTable({
  perms,
  onToggle,
}: {
  perms: PermSet;
  onToggle?: (catKey: string, action: PermAction) => void;
}) {
  const disabled = !onToggle;
  // The table renders once per key and once in the create form; each wraps it
  // in a TestIdScope so the checkbox ids stay unique on the page.
  const scope = useTestIdScope();
  const testIdPrefix = scope ? `${scope}-perm` : 'perm';

  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr className="text-left text-xs text-grouse uppercase">
            <th className="pr-8 py-1 font-medium">Category</th>
            {COLUMNS.map((col) => (
              <th key={col.action} className="px-4 py-1 font-medium text-center">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_CATEGORIES.map((cat) => {
            const p = perms[cat.key];
            const checked: Record<PermAction, boolean> = { r: p.r, w: p.w, x: p.x, '*': isAllPerms(p) };
            return (
              <tr key={cat.key} className="border-t border-heron/50">
                <td className="pr-8 py-1.5 text-swift">{cat.label}</td>
                {COLUMNS.map((col) => (
                  <td key={col.action} className="px-4 py-1.5 text-center">
                    <input
                      type="checkbox"
                      // e.g. "Devices read" — the column header alone doesn't name the checkbox
                      aria-label={`${cat.label} ${col.label.toLowerCase()}`}
                      checked={checked[col.action]}
                      data-testid={`${testIdPrefix}-${cat.key}-${col.testId}`}
                      disabled={disabled}
                      onChange={onToggle ? () => onToggle(cat.key, col.action) : undefined}
                      className="rounded"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
