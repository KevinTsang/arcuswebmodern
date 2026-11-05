'use client';

interface DeviceRemoveConfirmProps {
  name: string;
  /** dev:Remove is in flight (`requesting` stage): both buttons are disabled. */
  requesting: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

/** "Are you sure?" prompt before dev:Remove (`confirm` / `requesting` stages). */
export function DeviceRemoveConfirm({ name, requesting, onConfirm, onDismiss }: DeviceRemoveConfirmProps) {
  return (
    <div>
      <p className="text-sm text-swift mb-3">
        Are you sure you want to remove <strong>{name}</strong>? This will unpair
        the device from your hub. Rules and scenes using this device will be affected.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={requesting}
          data-testid="device-remove-confirm"
          className="bg-cardinal text-crane px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50"
        >
          {requesting ? 'Removing...' : 'Yes, Remove'}
        </button>
        <button
          onClick={onDismiss}
          disabled={requesting}
          data-testid="device-remove-cancel"
          className="border border-heron text-coot px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
