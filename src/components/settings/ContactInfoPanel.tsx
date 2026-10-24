'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Person } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';

export default function ContactInfoPanel() {
  const person = useAppSelector((s) => s.auth.person);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [firstName, setFirstName] = useState(person?.[Person.ATTR_FIRSTNAME] ?? '');
  const [lastName, setLastName] = useState(person?.[Person.ATTR_LASTNAME] ?? '');
  const [phone, setPhone] = useState(person?.[Person.ATTR_MOBILENUMBER] ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!person) return;
    const personId = person.personId;
    if (!personId) return;
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, `SERV:person:${personId}`, {
        [Person.ATTR_FIRSTNAME]: firstName,
        [Person.ATTR_LASTNAME]: lastName,
        [Person.ATTR_MOBILENUMBER]: phone,
      });
      dispatch(addNotification({ type: 'success', message: 'Contact info updated.' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update contact info.' }));
    } finally {
      setSaving(false);
    }
  }, [person, firstName, lastName, phone, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="contact-panel-title" className="text-lg font-semibold text-swift">Edit Contact Info</h3>
      <Field label="First Name" value={firstName} onChange={setFirstName} />
      <Field label="Last Name" value={lastName} onChange={setLastName} />
      <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
      <p className="text-xs text-grouse">Email cannot be changed here.</p>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          data-testid="contact-save"
          disabled={saving}
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
