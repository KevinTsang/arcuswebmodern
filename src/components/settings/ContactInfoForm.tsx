'use client';

import { useState, useCallback, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Person } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { validateFields, type ValidationConstraints } from '@/hooks/useFormValidation';
import { formatPhoneNumber } from '@/lib/phoneNumber';
import type { ContactField, ContactValues } from './contactInfo';
import Field from './Field';

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

interface ContactInfoFormProps {
  personId: string;
  loaded: ContactValues;
}

/** Edits the contact info loaded for `personId`, saving only the fields that changed. */
export default function ContactInfoForm({ personId, loaded }: ContactInfoFormProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [values, setValues] = useState<ContactValues>(loaded);
  // Set when Save finds invalid fields. From then on errors follow what the user types. Nothing is
  // validated on blur, so the Save/Cancel row never moves between mousedown and mouseup.
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const changes = useMemo(() => changedAttributes(loaded, values), [loaded, values]);
  const errors = useMemo(
    () => validateFields(CONTACT_CONSTRAINTS, Object.keys(changes), values),
    [changes, values],
  );
  const hasChanges = Object.keys(changes).length > 0;

  const setField = useCallback((field: ContactField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
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
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          data-testid="contact-save"
          disabled={!hasChanges || saving}
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
