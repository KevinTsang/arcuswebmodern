'use client';

interface DeviceRemoveAbortButtonProps {
  /** Hub removal: the button stops the hub's unpairing (Cancel) rather than just closing. */
  hubMode: boolean;
  /** STOP_UNPAIRING in flight: the button is disabled. */
  cancelling: boolean;
  onCancel: () => void;
}

/** Cancel / Close button shared by the steps and timed-out views. */
export function DeviceRemoveAbortButton({ hubMode, cancelling, onCancel }: DeviceRemoveAbortButtonProps) {
  return (
    <button
      onClick={onCancel}
      disabled={cancelling}
      data-testid="device-remove-abort"
      className="border border-heron text-coot px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50"
    >
      {cancelling ? 'Cancelling...' : hubMode ? 'Cancel' : 'Close'}
    </button>
  );
}
