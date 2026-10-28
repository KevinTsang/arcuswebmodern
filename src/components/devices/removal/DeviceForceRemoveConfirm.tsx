'use client';

interface DeviceForceRemoveConfirmProps {
  name: string;
  /** dev:ForceRemove sent (`forcing` stage): both buttons are disabled. */
  forcing: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

/** Force Remove confirmation and its pending state (`confirmForce` / `forcing` stages). */
export function DeviceForceRemoveConfirm({ name, forcing, onConfirm, onBack }: DeviceForceRemoveConfirmProps) {
  return (
    <div data-testid="device-remove-status" data-stage={forcing ? 'forcing' : 'confirmForce'}>
      <p data-testid="device-force-remove-warning" className="text-sm text-swift mb-3">
        Force Remove deletes <strong>{name}</strong> from your account without excluding
        it from the hub&apos;s network. The device may stay paired to the hub until you
        factory reset it.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={forcing}
          data-testid="device-force-remove-confirm"
          className="bg-cardinal text-crane px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50"
        >
          {forcing ? 'Removing...' : 'Yes, Force Remove'}
        </button>
        <button
          onClick={onBack}
          disabled={forcing}
          data-testid="device-force-remove-back"
          className="border border-heron text-coot px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50"
        >
          Back
        </button>
      </div>
    </div>
  );
}
