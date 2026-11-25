'use client';

/**
 * LockAccessCard — one keypad lock on the Access List.
 *
 * Shows the people whose PIN is on the lock (authorized or still being
 * written to it), the people who could be added, and the lock's PIN history.
 * Ticking or unticking a person sends `subdoorsnlocks:AuthorizePeople` with
 * a single AUTHORIZE / DEAUTHORIZE operation, as the legacy client did; the
 * subsystem then reports the person as PENDING until the lock confirms.
 *
 * PENDING doesn't say which way the change is going, so the card remembers
 * the removals it sent: a person being removed is shown as "Removing…" with
 * the people not on the lock, and isn't counted as using a PIN slot.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  AuthorizePeopleRequest, Base, Device, DoorLock, DoorsNLocksSubsystem, Person,
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
  /**
   * People this card asked the lock to remove, until their state settles; the value says
   * whether the lock has reported them PENDING yet.
   */
  const [removing, setRemoving] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  const lockAddress = lock[Base.ATTR_ADDRESS];
  const lockName = (lock[Device.ATTR_NAME] as string | undefined) ?? 'Lock';
  const slots = lock[DoorLock.ATTR_NUMPINSSUPPORTED] as number | undefined;

  const namesByAddress = useMemo(() => {
    const names = new Map<string, string>();
    for (const person of people) {
      const name = `${person[Person.ATTR_FIRSTNAME] ?? ''} ${person[Person.ATTR_LASTNAME] ?? ''}`.trim();
      names.set(person[Base.ATTR_ADDRESS], name || 'Unknown person');
    }
    return names;
  }, [people]);

  const getPersonName = useCallback(
    (personAddr: string): string => namesByAddress.get(personAddr) ?? 'Unknown person',
    [namesByAddress],
  );

  // Follow each removal: note when the lock reports PENDING, and forget it once the person is
  // UNAUTHORIZED, or PENDING has come and gone (the lock gave up and kept the PIN).
  let nextRemoving: Map<string, boolean> | null = null;
  for (const e of entries) {
    const seenPending = removing.get(e.person);
    if (seenPending === undefined) continue;
    const isPending = e.state === LockAuthorizationState.STATE_PENDING;
    const done = e.state === LockAuthorizationState.STATE_UNAUTHORIZED || (seenPending && !isPending);
    if (done || (isPending && !seenPending)) {
      nextRemoving ??= new Map(removing);
      if (done) nextRemoving.delete(e.person);
      else nextRemoving.set(e.person, true);
    }
  }
  if (nextRemoving) setRemoving(nextRemoving);

  const isRemoving = useCallback(
    (e: LockAuthorizationEntry) => e.state === LockAuthorizationState.STATE_PENDING && removing.has(e.person),
    [removing],
  );

  const { onLock, offLock } = useMemo(() => {
    const byName = (a: LockAuthorizationEntry, b: LockAuthorizationEntry) =>
      getPersonName(a.person).localeCompare(getPersonName(b.person));
    const isOff = (e: LockAuthorizationEntry) => e.state === LockAuthorizationState.STATE_UNAUTHORIZED || isRemoving(e);
    return {
      onLock: entries.filter((e) => !isOff(e)).sort(byName),
      offLock: entries.filter(isOff).sort(byName),
    };
  }, [entries, getPersonName, isRemoving]);

  const handleToggle = useCallback(async (entry: LockAuthorizationEntry) => {
    if (busyPerson) return;
    const authorize = entry.state === LockAuthorizationState.STATE_UNAUTHORIZED;
    setBusyPerson(entry.person);
    try {
      await Bridge.request(DoorsNLocksSubsystem.CMD_AUTHORIZEPEOPLE, subsystemAddress, {
        [AuthorizePeopleRequest.ATTR_DEVICE]: lockAddress,
        [AuthorizePeopleRequest.ATTR_OPERATIONS]: [{
          [LockAuthorizationOperation.ATTR_PERSON]: entry.person,
          [LockAuthorizationOperation.ATTR_OPERATION]: authorize
            ? LockAuthorizationOperation.OPERATION_AUTHORIZE
            : LockAuthorizationOperation.OPERATION_DEAUTHORIZE,
        }],
      });
      if (!authorize) setRemoving((prev) => new Map(prev).set(entry.person, false));
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
              removing={isRemoving(entry)}
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
                removing={isRemoving(entry)}
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
