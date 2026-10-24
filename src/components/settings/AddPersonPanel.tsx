'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import { Place } from '@arcus/core';
import type { CreateInvitationResponse } from '@/arcus/types';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';
import { RELATIONSHIPS } from './types';

// ── Component ────────────────────────────────────────────────────

interface AddPersonPanelProps {
  /** The place the invitation grants access to — not necessarily the active place. */
  placeId: string;
  /** Display name of that place, shown so the owner knows where the invitee gets access. */
  placeName: string;
  /** Called after invitation is sent successfully. */
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

  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="invite-panel-title" className="text-lg font-semibold text-swift">Invite a Person</h3>
      <p data-testid="invite-panel-place" className="text-sm text-grouse">
        Send an invitation to join <span className="font-medium text-swift">{placeName}</span>.
      </p>
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
