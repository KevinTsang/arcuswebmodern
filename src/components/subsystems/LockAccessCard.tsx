'use client';

/**
 * LockAccessCard — one keypad lock on the Access List.
 *
 * Shows the people whose PIN is on the lock (authorized or still being
 * written to it), the people who could be added, and the lock's PIN history.
 * Ticking or unticking a person sends `subdoorsnlocks:AuthorizePeople` with
 * a single AUTHORIZE / DEAUTHORIZE operation, as the legacy client did; the
 * subsystem then reports the person as PENDING until the lock confirms.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Base, Device, DoorLock, DoorsNLocksSubsystem, Person,
  LockAuthorizationOperation, LockAuthorizationState,
} from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAllPeople } from '@/store/slices/peopleSlice';
import { addNotification } from '@/store/slices/uiSlice';
import type { DeviceEntity, LockAuthorizationEntry } from '@/store/entityTypes';
import { LockPersonRow } from './LockPersonRow';
import { LockPinHistory } from './LockPinHistory';

interface LockAccessCardProps {
  lock: DeviceEntity;
  /** Address of the Doors & Locks subsystem, which receives AuthorizePeople. */
  subsystemAddress: string;
  entries: LockAuthorizationEntry[];
}

export function LockAccessCard({ lock, subsystemAddress, entries }: LockAccessCardProps) {
  const dispatch = useAppDispatch();
  const people = useAppSelector(selectAllPeople);
  const [busyPerson, setBusyPerson] = useState<string | null>(null);

  const lockAddress = lock[Base.ATTR_ADDRESS];
  const lockName = (lock[Device.ATTR_NAME] as string | undefined) ?? 'Lock';
  const slots = lock[DoorLock.ATTR_NUMPINSSUPPORTED] as number | undefined;

  const getPersonName = useCallback((personAddr: string): string => {
    const person = people.find((p) => p[Base.ATTR_ADDRESS] === personAddr);
    if (!person) return 'Unknown person';
    const first = person[Person.ATTR_FIRSTNAME] ?? '';
    const last = person[Person.ATTR_LASTNAME] ?? '';
    return `${first} ${last}`.trim() || 'Unknown person';
  }, [people]);

  const { onLock, offLock } = useMemo(() => {
    const byName = (a: LockAuthorizationEntry, b: LockAuthorizationEntry) =>
      getPersonName(a.person).localeCompare(getPersonName(b.person));
    return {
      onLock: entries.filter((e) => e.state !== LockAuthorizationState.STATE_UNAUTHORIZED).sort(byName),
      offLock: entries.filter((e) => e.state === LockAuthorizationState.STATE_UNAUTHORIZED).sort(byName),
    };
  }, [entries, getPersonName]);

  const handleToggle = useCallback(async (entry: LockAuthorizationEntry) => {
    if (busyPerson) return;
    const authorize = entry.state === LockAuthorizationState.STATE_UNAUTHORIZED;
    setBusyPerson(entry.person);
    try {
      await Bridge.request(DoorsNLocksSubsystem.CMD_AUTHORIZEPEOPLE, subsystemAddress, {
        device: lockAddress,
        operations: [{
          [LockAuthorizationOperation.ATTR_PERSON]: entry.person,
          [LockAuthorizationOperation.ATTR_OPERATION]: authorize
            ? LockAuthorizationOperation.OPERATION_AUTHORIZE
            : LockAuthorizationOperation.OPERATION_DEAUTHORIZE,
        }],
      });
    } catch {
      const name = getPersonName(entry.person);
      dispatch(addNotification({
        type: 'error',
        message: authorize
          ? `Couldn't add ${name} to ${lockName}`
          : `Couldn't remove ${name} from ${lockName}`,
      }));
    }
    setBusyPerson(null);
  }, [busyPerson, subsystemAddress, lockAddress, lockName, getPersonName, dispatch]);

  return (
    <div
      data-testid={`lock-access-${lockAddress}`}
      className="rounded-[var(--border-radius-base)] border border-heron p-4"
    >
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h4 className="text-sm font-medium text-swift">{lockName}</h4>
        {typeof slots === 'number' && slots > 0 && (
          <span data-testid={`lock-access-slots-${lockAddress}`} className="text-xs text-grouse">
            {onLock.length} of {slots} PINs used
          </span>
        )}
      </div>

      {onLock.length === 0 ? (
        <p data-testid={`lock-access-none-${lockAddress}`} className="text-sm text-grouse">
          No one&apos;s PIN is on this lock yet.
        </p>
      ) : (
        <ul className="divide-y divide-heron">
          {onLock.map((entry) => (
            <LockPersonRow
              key={entry.person}
              lockAddress={lockAddress}
              entry={entry}
              name={getPersonName(entry.person)}
              disabled={busyPerson !== null}
              onToggle={handleToggle}
            />
          ))}
        </ul>
      )}

      {offLock.length > 0 && (
        <>
          <h5 className="text-xs font-medium text-coot uppercase tracking-wide mt-4 mb-1">
            Add more people to your access list
          </h5>
          <ul className="divide-y divide-heron">
            {offLock.map((entry) => (
              <LockPersonRow
                key={entry.person}
                lockAddress={lockAddress}
                entry={entry}
                name={getPersonName(entry.person)}
                disabled={busyPerson !== null}
                onToggle={handleToggle}
              />
            ))}
          </ul>
        </>
      )}

      <LockPinHistory lockAddress={lockAddress} />
    </div>
  );
}
