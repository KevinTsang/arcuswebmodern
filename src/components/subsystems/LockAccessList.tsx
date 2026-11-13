'use client';

/**
 * LockAccessList — the Doors & Locks "Access List" tab.
 *
 * Replaces src/components/subsystem/doors-locks/access-list/. Lists every
 * keypad lock with the people whose PIN is on it, read from the subsystem's
 * `authorizationByLock`, and lets the user add or remove each person.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Base, Device } from '@arcus/core';
import { useDoorsLocksSubsystem } from '@/hooks/useDoorsLocksSubsystem';
import { LockAccessCard } from './LockAccessCard';

export function LockAccessList() {
  const { subsystem, locks, authorizationByLock } = useDoorsLocksSubsystem();
  const subsystemAddress = subsystem?.[Base.ATTR_ADDRESS];

  const sortedLocks = useMemo(
    () => [...locks].sort((a, b) =>
      ((a[Device.ATTR_NAME] as string) ?? '').localeCompare((b[Device.ATTR_NAME] as string) ?? '')),
    [locks],
  );

  if (!subsystemAddress || sortedLocks.length === 0) {
    return (
      <div data-testid="lock-access-empty" className="text-center py-8">
        <h3 className="text-base font-medium text-swift">Know Who Has Access to Your Home</h3>
        <p className="text-sm text-grouse mt-1">
          Pair a keypad lock to manage the people who can lock and unlock your doors using PIN codes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium text-swift">Lock Access List</h3>
        <p className="text-sm text-grouse mt-1">
          When you add someone to your access list, they can use their unique PIN to open your keypad lock.
        </p>
      </div>

      {sortedLocks.map((lock) => (
        <LockAccessCard
          key={lock.id}
          lock={lock}
          subsystemAddress={subsystemAddress}
          entries={authorizationByLock[lock[Base.ATTR_ADDRESS]] ?? []}
        />
      ))}

      <p data-testid="lock-access-add-person" className="text-xs text-grouse">
        Don&apos;t see the person you are looking for? People need a PIN for this place to be
        added. Invite people and manage PINs in{' '}
        <Link href="/settings" className="text-peacock hover:underline">Settings</Link>.
      </p>
    </div>
  );
}
