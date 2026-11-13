'use client';

/**
 * S2QrResult — what a scanned Z-Wave QR code says about the joining device.
 *
 * When groups 2–8 of the scanned DSK match the hub's, the user confirms
 * sending group 1 as the PIN. When they don't, the code belongs to another
 * device (or someone else's device is joining), so the user is warned and
 * offered to decline.
 */

interface S2QrResultProps {
  matched: boolean;
  /** DSK group 1 from the code. */
  pin: string;
  onSubmit: () => void;
  onDecline: () => void;
  onScanAgain: () => void;
  onManual: () => void;
}

const primary = 'flex-1 py-2 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane hover:bg-peacock/90';
const destructive = 'flex-1 py-2 rounded-[var(--border-radius-base)] text-sm font-medium bg-cardinal text-crane hover:bg-cardinal/90';
const secondary = 'flex-1 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon';

export function S2QrResult({ matched, pin, onSubmit, onDecline, onScanAgain, onManual }: S2QrResultProps) {
  if (matched) {
    return (
      <div data-testid="s2-qr-match">
        <p className="text-sm text-swift mb-1">The QR code matches the device that is joining.</p>
        <p className="text-sm text-coot mb-4">
          Send PIN <span data-testid="s2-qr-pin" className="font-mono text-swift">{pin}</span> to the hub?
        </p>
        <div className="flex gap-2">
          <button type="button" data-testid="s2-qr-submit" onClick={onSubmit} className={primary}>
            Send PIN
          </button>
          <button type="button" data-testid="s2-qr-back" onClick={onManual} className={secondary}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="s2-qr-mismatch">
      <p role="alert" className="text-sm text-swift p-3 mb-4 border border-cardinal bg-cardinal/5 rounded-[var(--border-radius-base)]">
        This QR code doesn&apos;t match the device that is joining. Make sure you scanned the right
        device. If you did, a different device may be trying to join: decline, and don&apos;t pair it.
      </p>
      <div className="flex gap-2">
        <button type="button" data-testid="s2-qr-decline" onClick={onDecline} className={destructive}>
          Decline
        </button>
        <button type="button" data-testid="s2-qr-scan-again" onClick={onScanAgain} className={secondary}>
          Scan again
        </button>
      </div>
      <button type="button" data-testid="s2-qr-manual" onClick={onManual} className="w-full mt-3 text-sm text-coot hover:underline">
        Enter the PIN by hand
      </button>
    </div>
  );
}
