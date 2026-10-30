'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Person } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { validateFields, type ValidationConstraints } from '@/hooks/useFormValidation';
import { formatPhoneNumber } from '@/lib/phoneNumber';
import type { PersonData } from '@/store/entityTypes';
import Field from './Field';

type ContactField =
  | typeof Person.ATTR_FIRSTNAME
  | typeof Person.ATTR_LASTNAME
  | typeof Person.ATTR_MOBILENUMBER;

/** The person attributes this panel edits, keyed by attribute name. */
type ContactValues = Record<ContactField, string>;

/** The person as loaded from the platform. The form is only shown, and saved, once it is `ready`. */
type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; loaded: ContactValues };

interface ContactFieldConfig {
  field: ContactField;
  id: string;
  label: string;
  type?: string;
  autoComplete: string;
}

const CONTACT_FIELDS: ContactFieldConfig[] = [
  { field: Person.ATTR_FIRSTNAME, id: 'contact-first-name', label: 'First Name', autoComplete: 'given-name' },
  { field: Person.ATTR_LASTNAME, id: 'contact-last-name', label: 'Last Name', autoComplete: 'family-name' },
  { field: Person.ATTR_MOBILENUMBER, id: 'contact-phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
];

const EMPTY_VALUES: ContactValues = {
  [Person.ATTR_FIRSTNAME]: '',
  [Person.ATTR_LASTNAME]: '',
  [Person.ATTR_MOBILENUMBER]: '',
};

// The legacy profile form's rules: names can't be blank, and the phone must be a US number.
// They only apply to fields the user changed, since sign-up and invite let people skip the phone.
const CONTACT_CONSTRAINTS: ValidationConstraints = {
  [Person.ATTR_FIRSTNAME]: { presence: true },
  [Person.ATTR_LASTNAME]: { presence: true },
  [Person.ATTR_MOBILENUMBER]: { presence: true, phoneNumber: true },
};

/** The value to save for `field`: trimmed, and a phone in the "(555) 123-4567" format the platform stores. */
function normalize(field: ContactField, value: string): string {
  const trimmed = value.trim();
  return field === Person.ATTR_MOBILENUMBER ? formatPhoneNumber(trimmed) ?? trimmed : trimmed;
}

/** Normalized values of the fields that differ from what was loaded. */
function changedAttributes(loaded: ContactValues, values: ContactValues): Partial<ContactValues> {
  const changes: Partial<ContactValues> = {};
  for (const { field } of CONTACT_FIELDS) {
    const value = normalize(field, values[field]);
    if (value !== normalize(field, loaded[field])) changes[field] = value;
  }
  return changes;
}

export default function ContactInfoPanel() {
  const personId = useAppSelector((s) => s.auth.person?.personId);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  // auth.person may be just the session payload (no names), so the form is never seeded from it.
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  // Set when Save finds invalid fields. From then on errors follow what the user types. Nothing is
  // validated on blur, so the Save/Cancel row never moves between mousedown and mouseup.
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;

    async function fetchPerson() {
      setLoad({ status: 'loading' });
      try {
        const attrs = await Bridge.request<PersonData>(Base.CMD_GETATTRIBUTES, `SERV:person:${personId}`, {});
        if (cancelled) return;
        const loaded: ContactValues = {
          [Person.ATTR_FIRSTNAME]: attrs[Person.ATTR_FIRSTNAME] ?? '',
          [Person.ATTR_LASTNAME]: attrs[Person.ATTR_LASTNAME] ?? '',
          [Person.ATTR_MOBILENUMBER]: attrs[Person.ATTR_MOBILENUMBER] ?? '',
        };
        setValues(loaded);
        setLoad({ status: 'ready', loaded });
      } catch {
        if (cancelled) return;
        setLoad({ status: 'error' });
        dispatch(addNotification({ type: 'error', message: 'Failed to load contact info.' }));
      }
    }

    fetchPerson();
    return () => { cancelled = true; };
  }, [personId, reloadKey, dispatch]);

  const changes = useMemo(
    () => (load.status === 'ready' ? changedAttributes(load.loaded, values) : {}),
    [load, values],
  );
  const errors = useMemo(
    () => validateFields(CONTACT_CONSTRAINTS, Object.keys(changes), values),
    [changes, values],
  );
  const hasChanges = Object.keys(changes).length > 0;

  const handleRetry = useCallback(() => setReloadKey((k) => k + 1), []);

  const setField = useCallback((field: ContactField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!personId || !hasChanges || saving) return;
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }

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
  }, [personId, hasChanges, saving, errors, changes, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="contact-panel-title" className="text-lg font-semibold text-swift">Edit Contact Info</h3>
      {!personId ? (
        <p data-testid="contact-signed-out" className="text-sm text-cardinal">
          Your session has ended. Sign in again to edit your contact info.
        </p>
      ) : load.status === 'ready' ? (
        <>
          {CONTACT_FIELDS.map(({ field, id, label, type, autoComplete }) => (
            <Field
              key={field}
              id={id}
              label={label}
              type={type}
              autoComplete={autoComplete}
              value={values[field]}
              onChange={(value) => setField(field, value)}
              disabled={saving}
              error={showErrors ? errors[field]?.[0] : undefined}
            />
          ))}
          <p className="text-xs text-grouse">Email cannot be changed here.</p>
        </>
      ) : load.status === 'error' ? (
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
          disabled={!personId || !hasChanges || saving}
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
