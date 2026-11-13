'use client';

/**
 * LockPersonRow — one person on a lock's access list, with a checkbox for
 * whether their PIN is on the lock. A PENDING person's PIN is still being
 * written to (or removed from) the lock, so their checkbox is disabled.
 */

import { useCallback } from 'react';
import { LockAuthorizationState } from '@arcus/core';
import type { LockAuthorizationEntry } from '@/store/entityTypes';

interface LockPersonRowProps {
  lockAddress: string;
  entry: LockAuthorizationEntry;
  name: string;
  disabled: boolean;
  onToggle: (entry: LockAuthorizationEntry) => void;
}

export function LockPersonRow({ lockAddress, entry, name, disabled, onToggle }: LockPersonRowProps) {
  const pending = entry.state === LockAuthorizationState.STATE_PENDING;
  const checked = entry.state !== LockAuthorizationState.STATE_UNAUTHORIZED;
  const inputId = `lock-person-${lockAddress}-${entry.person}`;

  const handleChange = useCallback(() => onToggle(entry), [onToggle, entry]);

  return (
    <li
      data-testid={inputId}
      data-state={entry.state}
      className="flex items-center justify-between gap-3 py-2"
    >
      <label htmlFor={inputId} className="flex-1 min-w-0 cursor-pointer">
        <span className="block text-sm text-swift">{name}</span>
        {pending && (
          <span className="block text-xs text-grouse">
            The lock is updating PINs, which may take a few minutes.
          </span>
        )}
      </label>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled || pending}
        onChange={handleChange}
        aria-label={`${name} can use their PIN on this lock`}
        data-testid={`lock-person-toggle-${lockAddress}-${entry.person}`}
        className="h-4 w-4 accent-peacock disabled:opacity-50"
      />
    </li>
  );
}
