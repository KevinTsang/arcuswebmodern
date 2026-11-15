'use client';

/**
 * ZWaveSecurityNotice — what a Z-Wave device's security class means for the user.
 *
 * Following zwave-js's S2 guide, the result of pairing is either confirmed or
 * warned about:
 * - an S2 device that ended up with S0 or no security (`S0Downgrade` in
 *   zwave-js) is always called out, since it can mean the key exchange was
 *   interfered with;
 * - any other downgrade (e.g. S2 Authenticated asked for, S2 Unauthenticated
 *   granted) usually means the PIN wasn't entered;
 * - otherwise, with `confirm`, the granted class is confirmed.
 */

import { securityClassLabel, type ZWaveSecurityInfo } from '@/lib/zwaveSecurity';

interface ZWaveSecurityNoticeProps {
  security: ZWaveSecurityInfo;
  /** Also say so when the device got what it asked for (end of pairing). */
  confirm?: boolean;
  className?: string;
}

export function ZWaveSecurityNotice({ security, confirm = false, className = '' }: ZWaveSecurityNoticeProps) {
  const granted = security.granted ? securityClassLabel(security.granted) : null;
  const requested = security.requested ? securityClassLabel(security.requested) : null;

  if (security.s0Downgrade) {
    return (
      <div
        role="alert"
        data-testid="zwave-security-s0-downgrade"
        className={`text-sm p-3 border border-cardinal bg-cardinal/5 rounded-[var(--border-radius-base)] ${className}`}
      >
        <p className="font-semibold text-swift mb-1">Security downgraded to {granted}</p>
        <p className="text-coot">
          This device supports {requested} but joined with {granted} only. That can happen when something
          interferes with the secure key exchange. Remove the device and pair it again. If it happens
          again, check for other Z-Wave controllers nearby before relying on this device.
        </p>
      </div>
    );
  }

  if (security.downgraded) {
    return (
      <p
        role="alert"
        data-testid="device-security-downgraded"
        className={`text-sm text-swift bg-pigeon border border-heron rounded-[var(--border-radius-base)] p-3 ${className}`}
      >
        This device joined with {granted} instead of the {requested} it asked for, usually because its
        S2 PIN wasn&apos;t entered while pairing. Remove it and pair it again, entering the PIN when asked,
        to give it full security.
      </p>
    );
  }

  if (confirm && granted) {
    return (
      <p data-testid="zwave-security-confirmed" className={`text-sm text-coot ${className}`}>
        Secured with {granted}.
      </p>
    );
  }

  return null;
}
