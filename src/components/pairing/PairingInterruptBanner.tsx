import Link from 'next/link';
import type { PairingInterruptReason } from './types';

interface PairingInterruptBannerProps {
  reason: PairingInterruptReason;
  /** True while the alarm that stopped pairing is still going off. */
  alarmActive: boolean;
  onResume: () => void;
  onCancel: () => void;
}

interface InterruptCopy {
  title: string;
  message: string;
  href: string;
  link: string;
}

const COPY: Record<PairingInterruptReason, InterruptCopy> = {
  incident: {
    title: 'Security Alarm',
    message: 'Pairing mode was turned off because an alarm went off.',
    href: '/services/alarms/status',
    link: 'View Alarm',
  },
  care: {
    title: 'Care Alarm',
    message: 'Pairing mode was turned off because a care alarm went off.',
    href: '/services/care/status',
    link: 'View Care Status',
  },
};

/**
 * Shown in place of the pairing steps / search when a care alarm or an alarm
 * incident stopped the hub's pairing mode. Mirrors the legacy pairing page's
 * alarm banner, and lets the user resume once the alarm has cleared.
 */
export default function PairingInterruptBanner({
  reason,
  alarmActive,
  onResume,
  onCancel,
}: PairingInterruptBannerProps) {
  const copy = COPY[reason];

  return (
    <div data-testid="pairing-interrupted" data-reason={reason} className="text-center py-6">
      <div className="w-16 h-16 bg-cardinal/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="icon-platform-security-1 text-2xl text-cardinal" />
      </div>
      <h3 className="text-lg font-semibold text-cardinal mb-2">{copy.title}</h3>
      <p className="text-sm text-swift mb-1">{copy.message}</p>
      <p data-testid="pairing-interrupted-hint" className="text-sm text-grouse mb-4">
        {alarmActive
          ? 'You can resume pairing once the alarm has been cleared.'
          : 'The alarm has been cleared. You can resume pairing.'}
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <Link
          href={copy.href}
          data-testid="pairing-interrupted-view"
          className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-peacock hover:bg-pigeon"
        >
          {copy.link}
        </Link>
        <button
          onClick={onResume}
          disabled={alarmActive}
          data-testid="pairing-interrupted-resume"
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Resume Pairing
        </button>
        <button
          onClick={onCancel}
          data-testid="pairing-interrupted-cancel"
          className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
