'use client';

/**
 * S2DskDisplay — the DSK a joining Z-Wave device reported, for the user to
 * check against its label. Group 1 is the PIN, which the hub doesn't know, so
 * it is shown as a blank for the user to fill in.
 */

interface S2DskDisplayProps {
  /** The eight DSK groups; the first is ignored. */
  groups: string[];
  /** Highlight groups 2–8 as matching (after a QR scan). */
  matched?: boolean;
}

export function S2DskDisplay({ groups, matched = false }: S2DskDisplayProps) {
  return (
    <ol
      data-testid="s2-dsk"
      aria-label="Device security key (DSK)"
      className="grid grid-cols-4 gap-2 font-mono text-sm"
    >
      <li
        data-testid="s2-dsk-group-1"
        className="text-center py-1.5 border border-dashed border-peacock rounded-[var(--border-radius-base)] text-peacock"
        aria-label="Group 1: the PIN"
      >
        PIN
      </li>
      {groups.slice(1).map((group, i) => (
        <li
          key={i}
          data-testid={`s2-dsk-group-${i + 2}`}
          className={`text-center py-1.5 border rounded-[var(--border-radius-base)] text-swift ${
            matched ? 'border-lovebird bg-lovebird/10' : 'border-heron bg-pigeon'
          }`}
        >
          {group}
        </li>
      ))}
    </ol>
  );
}
