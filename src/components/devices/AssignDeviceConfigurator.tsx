'use client';

import { useCallback, useState } from 'react';
import { Base, Person, Presence } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAllPeople } from '@/store/slices/peopleSlice';
import { addNotification } from '@/store/slices/uiSlice';

/** Sentinel radio value for "No One" (unassigned). */
const UNASSIGNED = '';

interface AssignOption {
  /** Person address, or UNASSIGNED. */
  value: string;
  label: string;
  sublabel?: string;
}

/**
 * Assigns a presence device (key fob, pendant, pet token) to a person at the
 * place, so its arrivals and departures count as that person coming home or
 * leaving. Choosing "No One" clears the assignment.
 *
 * Mirrors the legacy assign-device configurator: assigning sets `pres:person`
 * to the person's address with use hint PERSON; unassigning clears it and
 * resets the use hint to UNKNOWN.
 */
export default function AssignDeviceConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const people = useAppSelector(selectAllPeople);
  const dispatch = useAppDispatch();
  const { setAttributes } = useDeviceActions(address);
  const [saving, setSaving] = useState(false);

  const rawAssigned = (device?.[Presence.ATTR_PERSON] as string | undefined) ?? UNASSIGNED;
  // The platform reports an unassigned device as '' or 'UNSET'.
  const assigned = rawAssigned === 'UNSET' ? UNASSIGNED : rawAssigned;

  const handleSelect = useCallback(
    async (personAddress: string) => {
      if (personAddress === assigned) return;
      setSaving(true);
      try {
        await setAttributes(
          personAddress === UNASSIGNED
            ? { [Presence.ATTR_PERSON]: '', [Presence.ATTR_USEHINT]: Presence.USEHINT_UNKNOWN }
            : { [Presence.ATTR_PERSON]: personAddress, [Presence.ATTR_USEHINT]: Presence.USEHINT_PERSON },
        );
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to assign device.' }));
      } finally {
        setSaving(false);
      }
    },
    [assigned, setAttributes, dispatch],
  );

  const options: AssignOption[] = [
    ...people.map((p) => ({
      value: p[Base.ATTR_ADDRESS],
      label: `${p[Person.ATTR_FIRSTNAME] ?? ''} ${p[Person.ATTR_LASTNAME] ?? ''}`.trim() || 'Unnamed Person',
    })),
    { value: UNASSIGNED, label: 'No One', sublabel: 'Unassigned' },
  ];

  return (
    <fieldset disabled={saving}>
      <legend className="text-sm font-medium text-swift mb-2">Assign To</legend>
      <div className="space-y-1">
        {options.map((opt) => {
          const id = `assign-device-${opt.value || 'none'}`;
          return (
            <label
              key={id}
              htmlFor={id}
              data-testid={id}
              className="flex items-center gap-3 px-3 py-2 rounded-[var(--border-radius-base)] cursor-pointer hover:bg-pigeon"
            >
              <input
                id={id}
                type="radio"
                name={`assign-device-${address}`}
                value={opt.value}
                checked={assigned === opt.value}
                onChange={() => handleSelect(opt.value)}
                className="accent-peacock"
              />
              <span className="text-sm text-swift">
                {opt.label}
                {opt.sublabel && <span className="block text-xs text-grouse">{opt.sublabel}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {assigned !== UNASSIGNED && !people.some((p) => p[Base.ATTR_ADDRESS] === assigned) && (
        <p data-testid="assign-device-unknown" className="text-xs text-grouse mt-2">
          Currently assigned to someone who is no longer at this place.
        </p>
      )}
    </fieldset>
  );
}
