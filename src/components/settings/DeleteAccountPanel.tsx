'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Account, Person } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { logoutThunk } from '@/store/thunks/logoutThunk';
import type { SessionPlace } from '@/arcus/types';
import Field from './Field';

/** The word the person types to confirm. Matched without regard to case, like the legacy client. */
const CONFIRM_WORD = 'DELETE';

/** The session role of a place the person owns. */
const OWNER_ROLE = 'OWNER';

/** The account the person owns, from the places in their session; undefined when they own none. */
function ownedAccountId(places: SessionPlace[]): string | undefined {
  return places.find((p) => p.role === OWNER_ROLE)?.accountId;
}

/**
 * Deletes the signed-in person's login, after they type DELETE and then
 * confirm. An account owner deletes their whole account (places, hub and
 * billing included); anyone else deletes only their login. Signs out after.
 */
export default function DeleteAccountPanel() {
  const person = useAppSelector((s) => s.auth.person);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const personId = person?.personId;
  const accountId = ownedAccountId(person?.places ?? []);
  const typedConfirmation = typed.trim().toUpperCase() === CONFIRM_WORD;

  const handleSubmit = useCallback(() => {
    if (typedConfirmation) setConfirming(true);
  }, [typedConfirmation]);

  const handleDelete = useCallback(async () => {
    if (!personId || deleting) return;
    setDeleting(true);
    setError('');
    try {
      if (accountId) {
        await Bridge.request(Account.CMD_DELETE, `SERV:account:${accountId}`, { deleteOwnerLogin: true });
      } else {
        await Bridge.request(Person.CMD_DELETELOGIN, `SERV:person:${personId}`, {});
      }
      closeRight();
      dispatch(addNotification({ type: 'success', message: 'Your account has been deleted.' }));
      dispatch(logoutThunk());
    } catch {
      setError('An error occurred trying to delete your account. Please try again later.');
      dispatch(addNotification({ type: 'error', message: 'Failed to delete account.' }));
      setDeleting(false);
    }
  }, [personId, deleting, accountId, closeRight, dispatch]);

  if (!personId) {
    return (
      <p data-testid="delete-account-signed-out" className="p-4 text-sm text-cardinal">
        Your session has ended. Sign in again to delete your account.
      </p>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <p data-testid="delete-account-warning" className="text-sm text-coot">
        {accountId
          ? 'Deleting this account will erase your Arcus account, email address and personal information from the Arcus Hub and the Arcus servers. Any other places accessed through this account will also be removed, and any billing plans will be cancelled.'
          : 'Deleting this Arcus account will erase your email address and personal information from the Arcus servers. You will no longer be able to sign in to Arcus.'}
      </p>
      {confirming ? (
        <>
          <p data-testid="delete-account-confirm" className="text-sm font-medium text-cardinal">
            Are you sure? This action cannot be reversed.
          </p>
          {error && <p data-testid="delete-account-error" className="text-sm text-cardinal">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleDelete}
              data-testid="delete-account-yes"
              disabled={deleting}
              className="px-4 py-2 bg-cardinal text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-cardinal/90 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Yes, delete my account'}
            </button>
            <button onClick={closeRight} disabled={deleting} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon disabled:opacity-50">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <Field
            id="delete-account-word"
            label={`Type ${CONFIRM_WORD} to continue`}
            value={typed}
            onChange={setTyped}
            autoComplete="off"
          />
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              data-testid="delete-account-submit"
              disabled={!typedConfirmation}
              className="px-4 py-2 border border-cardinal text-cardinal rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-cardinal/10 disabled:opacity-50"
            >
              Continue
            </button>
            <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
