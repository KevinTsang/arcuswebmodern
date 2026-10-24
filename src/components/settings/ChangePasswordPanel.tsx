'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Person } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';

export default function ChangePasswordPanel() {
  const person = useAppSelector((s) => s.auth.person);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const email = person?.[Person.ATTR_EMAIL] ?? '';

  const handleChange = useCallback(async () => {
    if (newPw !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await Bridge.request('person:ChangePassword', 'SERV:person:', {
        currentPassword: currentPw,
        newPassword: newPw,
        emailAddress: email,
      });
      dispatch(addNotification({ type: 'success', message: 'Password changed.' }));
      closeRight();
    } catch {
      setError('Failed to change password. Check your current password.');
    } finally {
      setSaving(false);
    }
  }, [currentPw, newPw, confirmPw, email, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="password-panel-title" className="text-lg font-semibold text-swift">Change Password</h3>
      <Field label="Current Password" value={currentPw} onChange={setCurrentPw} type="password" />
      <Field label="New Password" value={newPw} onChange={setNewPw} type="password" />
      <Field label="Confirm New Password" value={confirmPw} onChange={setConfirmPw} type="password" />
      {error && <p data-testid="password-error" className="text-sm text-cardinal">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleChange}
          data-testid="password-change"
          disabled={saving || !currentPw || !newPw || !confirmPw}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Changing…' : 'Change Password'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}
