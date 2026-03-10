import { PERMISSION_CATEGORIES, isAllPerms, type PermSet } from './permissions';

export default function PermissionsTable({
  perms,
  onToggle,
}: {
  perms: PermSet;
  onToggle?: (catKey: string, action: 'r' | 'w' | 'x' | '*') => void;
}) {
  const disabled = !onToggle;
  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr className="text-left text-xs text-grouse uppercase">
            <th className="pr-8 py-1 font-medium">Category</th>
            <th className="px-4 py-1 font-medium text-center">Read</th>
            <th className="px-4 py-1 font-medium text-center">Write</th>
            <th className="px-4 py-1 font-medium text-center">Execute</th>
            <th className="px-4 py-1 font-medium text-center">All</th>
          </tr>
        </thead>
        <tbody>
          {PERMISSION_CATEGORIES.map((cat) => {
            const p = perms[cat.key];
            const all = isAllPerms(p);
            return (
              <tr key={cat.key} className="border-t border-heron/50">
                <td className="pr-8 py-1.5 text-swift">{cat.label}</td>
                <td className="px-4 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={p.r}
                    disabled={disabled}
                    onChange={onToggle ? () => onToggle(cat.key, 'r') : undefined}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={p.w}
                    disabled={disabled}
                    onChange={onToggle ? () => onToggle(cat.key, 'w') : undefined}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={p.x}
                    disabled={disabled}
                    onChange={onToggle ? () => onToggle(cat.key, 'x') : undefined}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={all}
                    disabled={disabled}
                    onChange={onToggle ? () => onToggle(cat.key, '*') : undefined}
                    className="rounded"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
