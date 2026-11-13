'use client';

import { useCallback, useEffect, useState } from 'react';
import cornea from '@arcus/core/cornea';
import { Base, PairingSubsystem } from '@arcus/core';
import { isS2FailureCode } from '@/lib/zwaveS2';

/** Subsystem events arrive under the normalized `sub` namespace (see cornea.getEventSubject). */
export const PAIRING_FAILED_EVENT = `sub ${PairingSubsystem.EVENT_PAIRINGFAILED}`;

/** A `subpairing:PairingFailed` event. */
export interface PairingFailedEvent {
  [Base.ATTR_ADDRESS]: string;
  code?: string;
  description?: string;
}

/**
 * The latest S2 PIN `PairingFailed` code (`zwave.s2.pin.timeout` or
 * `zwave.s2.pin.failed`) from this pairing subsystem, until dismissed.
 * Other pairing failures are ignored.
 */
export function useS2PairingFailure(pairingSubsystem: string): [string | null, () => void] {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const onFailed = (event: PairingFailedEvent) => {
      if (event[Base.ATTR_ADDRESS] !== pairingSubsystem) return;
      if (isS2FailureCode(event.code)) setCode(event.code ?? null);
    };
    cornea.on(PAIRING_FAILED_EVENT, onFailed);
    return () => {
      cornea.off(PAIRING_FAILED_EVENT, onFailed);
    };
  }, [pairingSubsystem]);

  const dismiss = useCallback(() => setCode(null), []);
  return [code, dismiss];
}
