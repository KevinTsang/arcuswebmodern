'use client';

/**
 * HubFirmwareExitModal — shown when the user tries to leave hub pairing while
 * the hub is downloading or applying a firmware update.
 *
 * Ported from the legacy pairing/firmware-exit component.
 */

interface HubFirmwareExitModalProps {
  open: boolean;
  onAcknowledge: () => void;
}

export function HubFirmwareExitModal({ open, onAcknowledge }: HubFirmwareExitModalProps) {
  if (!open) return null;

  return (
    <div
      data-testid="hub-firmware-exit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-firmware-exit-title"
      className="fixed inset-0 bg-swift/30 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-crane rounded-[var(--border-radius-lg)] border border-heron p-6 w-full max-w-sm shadow-lg">
        <h3 id="hub-firmware-exit-title" className="text-lg font-semibold text-swift mb-2">
          Firmware Update in Progress
        </h3>
        <p className="text-sm font-medium text-swift mb-2">
          Please do not exit the firmware update process until complete.
        </p>
        <p className="text-sm text-grouse mb-6">
          This may take 5-10 minutes depending on the speed of your internet connection.
          It is normal for the Smart Hub to reboot during this process.
        </p>
        <button
          type="button"
          data-testid="hub-firmware-exit-ok"
          onClick={onAcknowledge}
          className="w-full py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
        >
          Okay
        </button>
      </div>
    </div>
  );
}
