'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import { Person, Place } from '@arcus/core';
import type { AddPersonResponse } from '@/arcus/types';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { formatPhoneNumber } from '@/lib/phoneNumber';
import Field from './Field';

interface PartialAccessFormProps {
  /** The place the person is added to. */
  placeId: string;
  placeName: string;
  /** Called after the person is added. */
  onAdded?: () => void;
}

const PIN_PATTERN = /^\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  firstName?: string;
  email?: string;
  phone?: string;
  pin?: string;
  verifyPin?: string;
}

/**
 * Adds a partial-access ("hobbit") person: someone without a login who gets
 * a PIN for alarms and locks and can receive notifications. Creates them with
 * place:AddPerson, then sets their PIN with person:ChangePinV2, as the legacy
 * client's add-person panel does.
 */
export default function PartialAccessForm({ placeId, placeName, onAdded }: PartialAccessFormProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [verifyPin, setVerifyPin] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // False once this form is replaced or closed, so a save that finishes later
  // doesn't close (or toast over) whatever the side panel shows now.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleAdd = useCallback(async () => {
    const next: FormErrors = {};
    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    const formattedPhone = phone.trim() ? formatPhoneNumber(phone) : '';
    if (formattedPhone === null) next.phone = 'Enter a valid 10-digit phone number.';
    if (pin && !PIN_PATTERN.test(pin)) next.pin = 'PIN must be 4 digits.';
    if ((pin || verifyPin) && pin !== verifyPin) next.verifyPin = 'PIN codes do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    let newPerson: string;
    try {
      const resp = await Bridge.request<AddPersonResponse>(Place.CMD_ADDPERSON, `SERV:place:${placeId}`, {
        person: {
          [Person.ATTR_FIRSTNAME]: firstName.trim(),
          [Person.ATTR_LASTNAME]: lastName.trim(),
          ...(email.trim() ? { [Person.ATTR_EMAIL]: email.trim() } : {}),
          ...(formattedPhone ? { [Person.ATTR_MOBILENUMBER]: formattedPhone } : {}),
        },
      });
      newPerson = resp.newPerson;
    } catch {
      if (mountedRef.current) {
        dispatch(addNotification({ type: 'error', message: 'Failed to add person.' }));
        setSaving(false);
      }
      return;
    }

    // The person now exists, so the list refreshes whatever happens to the PIN.
    onAdded?.();
    if (pin && newPerson) {
      try {
        await Bridge.restfulRequest(Person.CMD_CHANGEPINV2, newPerson, { place: placeId, pin });
      } catch {
        if (!mountedRef.current) return;
        setSaving(false);
        dispatch(addNotification({
          type: 'error',
          message: `${name} was added, but the PIN couldn't be set. It may already be in use; set a different one from their details.`,
        }));
        closeRight();
        return;
      }
    }
    if (!mountedRef.current) return;
    setSaving(false);
    dispatch(addNotification({ type: 'success', message: `${name} has been added to ${placeName}.` }));
    closeRight();
  }, [firstName, lastName, email, phone, pin, verifyPin, placeId, placeName, dispatch, closeRight, onAdded]);

  return (
    <div data-testid="partial-access-form" className="space-y-4">
      <Field id="partial-first-name" label="First Name" value={firstName} onChange={setFirstName} error={errors.firstName} />
      <Field id="partial-last-name" label="Last Name" value={lastName} onChange={setLastName} />
      <Field id="partial-email" label="Email (optional)" value={email} onChange={setEmail} type="email" error={errors.email} />
      <Field id="partial-phone" label="Phone Number (optional)" value={phone} onChange={setPhone} type="tel" error={errors.phone} />
      <p className="text-xs text-grouse">
        By entering a phone number you acknowledge that this person has agreed to receive phone calls in the event of an alarm.
      </p>
      <p className="text-sm text-grouse">
        Assign a unique 4-digit PIN code to let this person arm and disarm alarms and lock and unlock locks.
      </p>
      <Field id="partial-pin" label="PIN Code" value={pin} onChange={setPin} type="password" autoComplete="new-password" error={errors.pin} />
      <Field id="partial-verify-pin" label="Verify PIN Code" value={verifyPin} onChange={setVerifyPin} type="password" autoComplete="new-password" error={errors.verifyPin} />
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleAdd}
          data-testid="partial-add"
          disabled={saving || !firstName.trim()}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add Person'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}
