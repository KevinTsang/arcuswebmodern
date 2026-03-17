'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Place } from '@arcus/core';
import type { CreateInvitationResponse } from '@/arcus/types';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';
import { RELATIONSHIPS } from './types';

// ── Component ────────────────────────────────────────────────────

interface AddPersonPanelProps {
  /** Called after invitation is sent successfully. */
  onSent?: () => void;
}

export default function AddPersonPanel({ onSent }: AddPersonPanelProps) {
  const place = useAppSelector((s) => s.place.place);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [relationshipTag, setRelationshipTag] = useState('');
  const [pleaseDescribe, setPleaseDescribe] = useState('');
  const [sending, setSending] = useState(false);

  const resolvedAddress = place?.[Base.ATTR_ADDRESS] as string | undefined;

  const relationship = relationshipTag === 'people_service_other'
    ? pleaseDescribe.trim() || 'OTHER'
    : relationshipTag || 'OTHER';

  const handleSend = useCallback(async () => {
    if (!resolvedAddress || !inviteEmail.trim()) return;
    setSending(true);
    try {
      const { invitation } = await Bridge.request<CreateInvitationResponse>(Place.CMD_CREATEINVITATION, resolvedAddress, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: inviteEmail.trim(),
        relationship,
      });
      await Bridge.request(Place.CMD_SENDINVITATION, resolvedAddress, { invitation });
      dispatch(addNotification({ type: 'success', message: 'Invitation sent!' }));
      onSent?.();
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to send invitation.' }));
    } finally {
      setSending(false);
    }
  }, [resolvedAddress, firstName, lastName, inviteEmail, relationship, dispatch, closeRight, onSent]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-swift">Invite a Person</h3>
      <p className="text-sm text-grouse">Send an invitation to join this place.</p>
      <Field label="First Name" value={firstName} onChange={setFirstName} />
      <Field label="Last Name" value={lastName} onChange={setLastName} />
      <Field label="Email" value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="person@example.com" />

      <div>
        <label className="block text-sm text-grouse mb-1">Relationship</label>
        <select
          value={relationshipTag}
          onChange={(e) => setRelationshipTag(e.target.value)}
          className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock bg-crane"
        >
          <option value="">Select a relationship…</option>
          {RELATIONSHIPS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.items.map((item) => (
                <option key={item.tag} value={item.tag}>
                  {item.display}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {relationshipTag === 'people_service_other' && (
        <Field
          label="Please Describe"
          value={pleaseDescribe}
          onChange={setPleaseDescribe}
          placeholder="e.g. Property Manager"
        />
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSend}
          disabled={sending || !inviteEmail.trim()}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send Invitation'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}
