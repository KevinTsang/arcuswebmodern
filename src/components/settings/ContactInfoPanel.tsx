'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Person } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';
import type { PersonData } from '@/store/entityTypes';
import Field from './Field';

type ContactField =
  | typeof Person.ATTR_FIRSTNAME
  | typeof Person.ATTR_LASTNAME
  | typeof Person.ATTR_MOBILENUMBER;

/** The person attributes this panel edits, keyed by attribute name. */
type ContactValues = Record<ContactField, string>;

const CONTACT_FIELDS: ContactField[] = [Person.ATTR_FIRSTNAME, Person.ATTR_LASTNAME, Person.ATTR_MOBILENUMBER];

// Same rules as the legacy profile contact-info form: names and a 10-digit phone are required.
const CONTACT_CONSTRAINTS: ValidationConstraints = {
  [Person.ATTR_FIRSTNAME]: { presence: true },
  [Person.ATTR_LASTNAME]: { presence: true },
  [Person.ATTR_MOBILENUMBER]: { presence: true, phoneNumber: true },
};

/** Trimmed values of the fields that differ from what was loaded. */
function changedAttributes(loaded: ContactValues, values: ContactValues): Partial<ContactValues> {
  const changes: Partial<ContactValues> = {};
  for (const field of CONTACT_FIELDS) {
    const value = values[field].trim();
    if (value !== loaded[field].trim()) changes[field] = value;
  }
  return changes;
}

export default function ContactInfoPanel() {
  const personId = useAppSelector((s) => s.auth.person?.personId);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const form = useFormValidation(CONTACT_CONSTRAINTS);

  // The person's current attributes, fetched from the platform when the panel opens. The store's
  // auth.person may be just the session payload (no names), so the form is never seeded from it.
  const [loaded, setLoaded] = useState<ContactValues | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoaded(null);
      setLoadFailed(false);
      try {
        if (!personId) throw new Error('No signed-in person');
        const attrs = await Bridge.request<PersonData>(Base.CMD_GETATTRIBUTES, `SERV:person:${personId}`, {});
        if (cancelled) return;
        const current: ContactValues = {
          [Person.ATTR_FIRSTNAME]: attrs[Person.ATTR_FIRSTNAME] ?? '',
          [Person.ATTR_LASTNAME]: attrs[Person.ATTR_LASTNAME] ?? '',
          [Person.ATTR_MOBILENUMBER]: attrs[Person.ATTR_MOBILENUMBER] ?? '',
        };
        setFirstName(current[Person.ATTR_FIRSTNAME]);
        setLastName(current[Person.ATTR_LASTNAME]);
        setPhone(current[Person.ATTR_MOBILENUMBER]);
        setLoaded(current);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [personId, reloadKey]);

  const values = useMemo<ContactValues>(() => ({
    [Person.ATTR_FIRSTNAME]: firstName,
    [Person.ATTR_LASTNAME]: lastName,
    [Person.ATTR_MOBILENUMBER]: phone,
  }), [firstName, lastName, phone]);

  const hasChanges = loaded !== null && Object.keys(changedAttributes(loaded, values)).length > 0;

  const handleRetry = useCallback(() => setReloadKey((k) => k + 1), []);

  // After a save attempt has flagged fields, re-check them as the user moves between inputs.
  const handleBlur = useCallback(() => {
    const flagged = CONTACT_FIELDS.filter((field) => form.visited[field]);
    if (flagged.length > 0) form.formValidates(flagged, values);
  }, [form, values]);

  const handleSave = useCallback(async () => {
    if (!personId || !loaded || saving) return;
    if (!form.formValidates(CONTACT_FIELDS, values)) return;
    const changes = changedAttributes(loaded, values);
    if (Object.keys(changes).length === 0) return;

    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, `SERV:person:${personId}`, changes);
      dispatch(addNotification({ type: 'success', message: 'Contact info updated.' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update contact info.' }));
    } finally {
      setSaving(false);
    }
  }, [personId, loaded, saving, form, values, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="contact-panel-title" className="text-lg font-semibold text-swift">Edit Contact Info</h3>
      {loaded ? (
        <>
          <Field
            label="First Name"
            value={firstName}
            onChange={setFirstName}
            onBlur={handleBlur}
            error={form.getFieldErrors(Person.ATTR_FIRSTNAME)[0]}
          />
          <Field
            label="Last Name"
            value={lastName}
            onChange={setLastName}
            onBlur={handleBlur}
            error={form.getFieldErrors(Person.ATTR_LASTNAME)[0]}
          />
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            onBlur={handleBlur}
            type="tel"
            error={form.getFieldErrors(Person.ATTR_MOBILENUMBER)[0]}
          />
          <p className="text-xs text-grouse">Email cannot be changed here.</p>
        </>
      ) : loadFailed ? (
        <div className="space-y-2">
          <p data-testid="contact-load-error" className="text-sm text-cardinal">
            Unable to load your contact info.
          </p>
          <button data-testid="contact-retry" onClick={handleRetry} className="text-sm text-peacock hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <p data-testid="contact-loading" className="text-sm text-grouse">Loading contact info…</p>
      )}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          data-testid="contact-save"
          disabled={!loaded || !hasChanges || saving}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}
