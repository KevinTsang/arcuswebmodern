'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import type { GetInvitationResponse } from '@/arcus/types';
import type { Invitation } from '@/store/slices/invitationsSlice';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import InfoCard from './InfoCard';
import Field from './Field';

export default function InvitationSection() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const dispatch = useAppDispatch();

  const handleLookup = useCallback(async () => {
    if (!code.trim() || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const resp = await Bridge.request<GetInvitationResponse>('invite:GetInvitation', 'SERV:invite:', {
        code: code.trim(),
        inviteeEmail: email.trim(),
      });
      setInvitation(resp.invitation);
    } catch {
      setError(
        'Email and/or invitation code not recognized. Please check your email and invitation code and try again. Invitation codes expire after 7 days.',
      );
    } finally {
      setLoading(false);
    }
  }, [code, email]);

  const handleAccept = useCallback(async () => {
    if (!invitation) return;
    setLoading(true);
    setError('');
    try {
      await Bridge.request('invite:AcceptInvitationCreateLogin', 'SERV:invite:', {
        code: code.trim(),
        inviteeEmail: email.trim(),
      });
      dispatch(addNotification({ type: 'success', message: 'Invitation accepted!' }));
      setInvitation(null);
      setCode('');
      setEmail('');
    } catch {
      setError('Failed to accept the invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [invitation, code, email, dispatch]);

  return (
    <div className="max-w-md space-y-6">
      <InfoCard title="Enter Invitation Code">
        <p className="text-sm text-grouse mb-4">
          If you received an invitation to join someone&apos;s place, enter the code and email below.
        </p>

        {!invitation ? (
          <>
            <Field label="Invitation Code" value={code} onChange={setCode} placeholder="Enter code" />
            <Field label="Email Address" value={email} onChange={setEmail} type="email" placeholder="Email used for invitation" />
            {error && <p data-testid="invitation-error" className="text-sm text-cardinal mt-2">{error}</p>}
            <button
              onClick={handleLookup}
              data-testid="invitation-lookup"
              disabled={loading || !code.trim() || !email.trim()}
              className="mt-4 px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
            >
              {loading ? 'Looking up…' : 'Look Up Invitation'}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div data-testid="invitation-summary" className="bg-honeycreeper/5 border border-honeycreeper/20 rounded-[var(--border-radius-base)] p-4">
              <p className="text-sm text-swift">
                You&apos;ve been invited to{' '}
                <strong>
                  {invitation.invitorFirstName ?? ''} {invitation.invitorLastName ?? ''}&apos;s
                </strong>{' '}
                place: <strong>{invitation.placeName ?? 'a place'}</strong>.
              </p>
            </div>
            {error && <p className="text-sm text-cardinal">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                data-testid="invitation-accept"
                disabled={loading}
                className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                {loading ? 'Accepting…' : 'Accept Invitation'}
              </button>
              <button
                onClick={() => {
                  setInvitation(null);
                  setCode('');
                  setEmail('');
                  setError('');
                }}
                className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </InfoCard>
    </div>
  );
}
