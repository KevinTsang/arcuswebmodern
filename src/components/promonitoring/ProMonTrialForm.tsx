'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Bridge from '@arcus/core/bridge';
import { ProMonitoringSettings } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

/** Where legacy sent people who want a trial code. */
const REQUEST_CODE_URL = 'https://www.arcus.com/monitoring/';

interface ProMonTrialFormProps {
  /** Address of the place's ProMonitoringSettings object. */
  settingsAddress: string;
  /** Called once the platform accepts the code. */
  onJoined: () => void;
}

/**
 * Trial code entry, shown when professional monitoring is only available to
 * the trial group at this place. Ported from legacy's promon-trial form.
 */
export function ProMonTrialForm({ settingsAddress, onJoined }: ProMonTrialFormProps) {
  const dispatch = useAppDispatch();
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const trimmed = code.trim();

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!trimmed || saving) return;
      setSaving(true);
      try {
        await Bridge.request(ProMonitoringSettings.CMD_JOINTRIAL, settingsAddress, { code: trimmed });
        dispatch(addNotification({ type: 'success', message: 'Trial code accepted.' }));
        onJoined();
      } catch {
        setFailedAttempts((n) => n + 1);
        dispatch(addNotification({ type: 'error', message: 'That Professional Monitoring code was not accepted.' }));
      } finally {
        setSaving(false);
      }
    },
    [trimmed, saving, settingsAddress, dispatch, onJoined],
  );

  return (
    <form onSubmit={handleSubmit} data-testid="promon-trial-form" className="space-y-4 mt-4">
      <p className="text-sm text-grouse">
        Professional Monitoring is available in limited areas and is invite only.
      </p>
      <p className="text-sm text-grouse">
        <a
          href={REQUEST_CODE_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="promon-trial-request-link"
          className="text-peacock hover:underline"
        >
          Request a Professional Monitoring Code
        </a>{' '}
        or enter one below.
      </p>
      <div>
        <label htmlFor="promon-trial-code" className="block text-sm font-medium text-swift mb-1">
          Code
        </label>
        <input
          id="promon-trial-code"
          type="password"
          autoComplete="off"
          data-testid="promon-trial-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
        />
      </div>
      {failedAttempts > 0 && (
        <p data-testid="promon-trial-error" className="text-sm text-cardinal">
          {failedAttempts === 1
            ? 'If you received an invitation, please enter the code again.'
            : 'Hmmm... It looks like the code is still invalid.'}{' '}
          If the problem persists, please contact Arcus Support.
        </p>
      )}
      <button
        type="submit"
        data-testid="promon-trial-submit"
        disabled={!trimmed || saving}
        className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : failedAttempts === 0 ? 'Submit' : 'Try Again'}
      </button>
    </form>
  );
}
