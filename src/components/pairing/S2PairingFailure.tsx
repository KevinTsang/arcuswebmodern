'use client';

/**
 * S2PairingFailure — tells the user when secure Z-Wave (S2) pairing failed.
 *
 * Shown for `subpairing:PairingFailed` with `zwave.s2.pin.timeout` or
 * `zwave.s2.pin.failed`. Either way the device is on the network without S2
 * and has to be removed (excluded) or factory reset and paired again.
 */

import { useS2PairingFailure } from '@/hooks/useS2PairingFailure';
import { S2_PIN_TIMEOUT } from '@/lib/zwaveS2';

interface S2PairingFailureProps {
  pairingSubsystem: string;
}

export function S2PairingFailure({ pairingSubsystem }: S2PairingFailureProps) {
  const [code, dismiss] = useS2PairingFailure(pairingSubsystem);
  if (!code) return null;

  const timedOut = code === S2_PIN_TIMEOUT;

  return (
    <div
      role="alert"
      data-testid="s2-pairing-failure"
      data-code={code}
      className="mb-4 p-4 border border-cardinal bg-cardinal/5 rounded-[var(--border-radius-base)]"
    >
      <h3 className="text-sm font-semibold text-swift mb-1">
        {timedOut ? 'The S2 PIN wasn’t entered in time' : 'Secure pairing failed'}
      </h3>
      <p className="text-sm text-coot mb-2">
        {timedOut
          ? 'The Z-Wave device joined without S2 security because nobody entered its PIN before the time ran out.'
          : 'The Z-Wave device joined without S2 security. This usually means the PIN was wrong.'}
      </p>
      <p className="text-sm text-coot mb-3">
        To secure it, exclude the device (Devices &rarr; Remove Z-Wave Device) or factory reset it,
        then pair it again and enter the PIN from its label.
      </p>
      <button
        type="button"
        onClick={dismiss}
        data-testid="s2-pairing-failure-dismiss"
        className="text-sm text-peacock hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
