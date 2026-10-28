'use client';

import { DeviceRemoveAbortButton } from './DeviceRemoveAbortButton';

interface DeviceRemoveTimedOutProps {
  name: string;
  hubMode: boolean;
  cancelling: boolean;
  onForceRemove: () => void;
  onCancel: () => void;
}

/** No base:Deleted within REMOVE_TIMEOUT: offers Force Remove (`timedOut` stage). */
export function DeviceRemoveTimedOut({ name, hubMode, cancelling, onForceRemove, onCancel }: DeviceRemoveTimedOutProps) {
  return (
    <div data-testid="device-remove-status" data-stage="timedOut">
      <h4 data-testid="device-remove-title" className="text-base font-medium text-swift mb-2">
        Removal was unsuccessful.
      </h4>
      <p className="text-sm text-grouse mb-3">
        {name} wasn&apos;t removed. Force Remove deletes it from your account even if
        the device can&apos;t be reached.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onForceRemove}
          data-testid="device-force-remove"
          className="bg-cardinal text-crane px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50"
        >
          Force Remove
        </button>
        <DeviceRemoveAbortButton hubMode={hubMode} cancelling={cancelling} onCancel={onCancel} />
      </div>
    </div>
  );
}
