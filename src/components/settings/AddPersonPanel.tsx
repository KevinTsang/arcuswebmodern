'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';

export default function AddPersonPanel() {
  const place = useAppSelector((s) => s.place.place);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!place || !inviteEmail.trim()) return;
    setSending(true);
    try {
      await Bridge.request('place:SendInvitation', place['base:address'] as string, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: inviteEmail.trim(),
      });
      dispatch(addNotification({ type: 'success', message: 'Invitation sent!' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to send invitation.' }));
    } finally {
      setSending(false);
    }
  }, [place, firstName, lastName, inviteEmail, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-swift">Invite a Person</h3>
      <p className="text-sm text-grouse">Send an invitation to join this place.</p>
      <Field label="First Name" value={firstName} onChange={setFirstName} />
      <Field label="Last Name" value={lastName} onChange={setLastName} />
      <Field label="Email" value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="person@example.com" />
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
