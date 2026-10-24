'use client';

/**
 * AlarmPanicControl — manually raises a panic alarm (subalarm:Panic).
 *
 * The platform raises a user-sourced panic as a verified alarm, and PANIC
 * is a pro-monitored alert, so it can reach the monitoring center with no
 * pre-alert window to cancel. The command is therefore sent only after an
 * explicit second step:
 *  - Clicking Panic swaps the button for a warning prompt; nothing is sent.
 *  - The confirm button sits below the warning, not where Panic was, and
 *    focus starts on Cancel, so a double-click or repeated key press
 *    can't confirm by accident.
 *  - Both buttons are disabled while the request is in flight.
 */

import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { AlarmSubsystem, Bridge } from '@arcus/core';
import { useCallback, useState } from 'react';

interface AlarmPanicControlProps {
  /** Address of the place's alarm subsystem (`SERV:subalarm:<place>`). */
  address: string;
}

export function AlarmPanicControl({ address }: AlarmPanicControlProps) {
  const dispatch = useAppDispatch();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const handleConfirm = useCallback(async () => {
    setSending(true);
    try {
      await Bridge.request(AlarmSubsystem.CMD_PANIC, address, {});
      setConfirming(false);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to trigger panic alarm' }));
    }
    setSending(false);
  }, [address, dispatch]);

  return (
    <section data-testid="alarm-panic-section" className="border-t border-heron pt-6">
      {!confirming ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-swift">Emergency</h3>
            <p className="text-xs text-grouse mt-0.5">Trigger a panic alarm if you need help.</p>
          </div>
          <button
            onClick={() => setConfirming(true)}
            data-testid="alarm-panic"
            className="shrink-0 border border-cardinal text-cardinal px-6 py-2 rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-cardinal/5"
          >
            Panic
          </button>
        </div>
      ) : (
        <div
          role="group"
          aria-labelledby="alarm-panic-confirm-title"
          aria-describedby="alarm-panic-confirm-message"
          data-testid="alarm-panic-confirm-prompt"
          className="rounded-[var(--border-radius-base)] border border-cardinal/30 bg-cardinal/5 p-4"
        >
          <h3 id="alarm-panic-confirm-title" className="text-sm font-semibold text-cardinal mb-1">
            Trigger a panic alarm?
          </h3>
          <p id="alarm-panic-confirm-message" className="text-sm text-swift mb-4">
            This sets off your alarm right away and notifies the people on your notification
            list. If you have professional monitoring, the monitoring center may dispatch
            emergency responders.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setConfirming(false)}
              disabled={sending}
              autoFocus
              data-testid="alarm-panic-cancel"
              className="border border-heron text-coot px-4 py-2 rounded-[var(--border-radius-base)] text-sm hover:bg-pigeon disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={sending}
              data-testid="alarm-panic-confirm"
              className="bg-cardinal text-crane px-4 py-2 rounded-[var(--border-radius-base)] text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {sending ? 'Triggering...' : 'Yes, Trigger Panic Alarm'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
