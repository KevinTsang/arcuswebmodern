'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import { Place } from '@arcus/core';
import type { CreateInvitationResponse } from '@/arcus/types';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';
import PartialAccessForm from './PartialAccessForm';
import { RELATIONSHIPS } from './types';

type AccessType = 'FULL_ACCESS' | 'HOBBIT';

const ACCESS_TYPES: { value: AccessType; label: string; description: string }[] = [
  {
    value: 'FULL_ACCESS',
    label: 'Full Access (email required)',
    description: 'Same access as the account owner: add and remove people, control alarms and locks, '
      + 'view and change settings, and more. Ideal for a spouse, partner or roommate.',
  },
  {
    value: 'HOBBIT',
    label: 'Partial Access',
    description: 'A PIN for alarms and locks and rule notifications, without a login. '
      + 'Ideal for children, family, friends and service personnel.',
  },
];

// ── Component ────────────────────────────────────────────────────

interface AddPersonPanelProps {
  /** The place the invitation grants access to — not necessarily the active place. */
  placeId: string;
  /** Display name of that place, shown so the owner knows where the invitee gets access. */
  placeName: string;
  /** Called after an invitation is sent or a partial-access person is added. */
  onSent?: () => void;
}

export default function AddPersonPanel({ placeId, placeName, onSent }: AddPersonPanelProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [relationshipTag, setRelationshipTag] = useState('');
  const [pleaseDescribe, setPleaseDescribe] = useState('');
  const [sending, setSending] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>('FULL_ACCESS');

  // False once this panel is replaced or closed, so a send that finishes
  // later doesn't close (or toast over) whatever the side panel shows now.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const placeAddress = `SERV:place:${placeId}`;

  const relationship = relationshipTag === 'people_service_other'
    ? pleaseDescribe.trim() || 'OTHER'
    : relationshipTag || 'OTHER';

  const handleSend = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      const { invitation } = await Bridge.request<CreateInvitationResponse>(Place.CMD_CREATEINVITATION, placeAddress, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: inviteEmail.trim(),
        relationship,
      });
      await Bridge.request(Place.CMD_SENDINVITATION, placeAddress, { invitation });
      onSent?.();
      if (!mountedRef.current) return;
      dispatch(addNotification({ type: 'success', message: 'Invitation sent!' }));
      closeRight();
    } catch {
      if (!mountedRef.current) return;
      dispatch(addNotification({ type: 'error', message: 'Failed to send invitation.' }));
    } finally {
      setSending(false);
    }
  }, [placeAddress, firstName, lastName, inviteEmail, relationship, dispatch, closeRight, onSent]);

  const accessPicker = (
    <fieldset className="space-y-2">
      <legend className="block text-sm text-grouse mb-1">Access</legend>
      {ACCESS_TYPES.map((t) => (
        <label
          key={t.value}
          className="flex gap-2 items-start p-2 border border-heron rounded-[var(--border-radius-base)] cursor-pointer"
        >
          <input
            type="radio"
            name="access-type"
            value={t.value}
            checked={accessType === t.value}
            onChange={() => setAccessType(t.value)}
            data-testid={`access-type-${t.value === 'FULL_ACCESS' ? 'full' : 'partial'}`}
            className="mt-1"
          />
          <span>
            <span className="block text-sm text-swift">{t.label}</span>
            <span className="block text-xs text-grouse">{t.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );

  if (accessType === 'HOBBIT') {
    return (
      <div className="p-4 space-y-4">
        <p data-testid="invite-panel-place" className="text-sm text-grouse">
          Add a person to <span className="font-medium text-swift">{placeName}</span>.
        </p>
        {accessPicker}
        <PartialAccessForm placeId={placeId} placeName={placeName} onAdded={onSent} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <p data-testid="invite-panel-place" className="text-sm text-grouse">
        Send an invitation to join <span className="font-medium text-swift">{placeName}</span>.
      </p>
      {accessPicker}
      <Field label="First Name" value={firstName} onChange={setFirstName} />
      <Field label="Last Name" value={lastName} onChange={setLastName} />
      <Field label="Email" value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="person@example.com" />

      <div>
        <label className="block text-sm text-grouse mb-1">Relationship</label>
        <select
          data-testid="invite-relationship"
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
          data-testid="invite-send"
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
