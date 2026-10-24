'use client';

/**
 * DeviceRemovalSection — the Remove Device section of the device details panel.
 *
 * Renders each stage of the flow driven by useDeviceRemoval: confirmation,
 * the removal steps returned by dev:Remove while waiting for the device to be
 * deleted, and Force Remove once that wait times out.
 *
 * Replaces src/components/device/remove-panel/remove-panel.stache.
 */

import { RemovalMode, type DeviceRemovalFlow } from '@/hooks/useDeviceRemoval';

interface DeviceRemovalSectionProps {
  name: string;
  removal: DeviceRemovalFlow;
}

const PRIMARY_BUTTON =
  'bg-cardinal text-crane px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50';
const SECONDARY_BUTTON =
  'border border-heron text-coot px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50';

export function DeviceRemovalSection({ name, removal }: DeviceRemovalSectionProps) {
  const { stage, mode, steps, cancelling } = removal;

  if (stage === 'idle') {
    return (
      <button
        onClick={removal.requestRemove}
        data-testid="device-remove"
        className="text-sm text-cardinal hover:underline"
      >
        Remove Device
      </button>
    );
  }

  if (stage === 'confirm' || stage === 'requesting') {
    const requesting = stage === 'requesting';
    return (
      <div>
        <p className="text-sm text-swift mb-3">
          Are you sure you want to remove <strong>{name}</strong>? This will unpair
          the device from your hub. Rules and scenes using this device will be affected.
        </p>
        <div className="flex gap-3">
          <button
            onClick={removal.remove}
            disabled={requesting}
            data-testid="device-remove-confirm"
            className={PRIMARY_BUTTON}
          >
            {requesting ? 'Removing...' : 'Yes, Remove'}
          </button>
          <button
            onClick={removal.dismissRemove}
            disabled={requesting}
            data-testid="device-remove-cancel"
            className={SECONDARY_BUTTON}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'confirmForce' || stage === 'forcing') {
    const forcing = stage === 'forcing';
    return (
      <div data-testid="device-remove-status" data-stage={stage}>
        <p data-testid="device-force-remove-warning" className="text-sm text-swift mb-3">
          Force Remove deletes <strong>{name}</strong> from your account without excluding
          it from the hub&apos;s network. The device may stay paired to the hub until you
          factory reset it.
        </p>
        <div className="flex gap-3">
          <button
            onClick={removal.forceRemove}
            disabled={forcing}
            data-testid="device-force-remove-confirm"
            className={PRIMARY_BUTTON}
          >
            {forcing ? 'Removing...' : 'Yes, Force Remove'}
          </button>
          <button
            onClick={removal.dismissForceRemove}
            disabled={forcing}
            data-testid="device-force-remove-back"
            className={SECONDARY_BUTTON}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // removing / timedOut
  const hubMode = mode === RemovalMode.HUB_AUTOMATIC || mode === RemovalMode.HUB_MANUAL;
  const cancelButton = (
    <button
      onClick={removal.cancel}
      disabled={cancelling}
      data-testid="device-remove-abort"
      className={SECONDARY_BUTTON}
    >
      {cancelling ? 'Cancelling...' : hubMode ? 'Cancel' : 'Close'}
    </button>
  );

  if (stage === 'timedOut') {
    return (
      <div data-testid="device-remove-status" data-stage={stage}>
        <h4 data-testid="device-remove-title" className="text-base font-medium text-swift mb-2">
          Removal was unsuccessful.
        </h4>
        <p className="text-sm text-grouse mb-3">
          {name} wasn&apos;t removed. Force Remove deletes it from your account even if
          the device can&apos;t be reached.
        </p>
        <div className="flex gap-3">
          <button
            onClick={removal.requestForceRemove}
            data-testid="device-force-remove"
            className={PRIMARY_BUTTON}
          >
            Force Remove
          </button>
          {cancelButton}
        </div>
      </div>
    );
  }

  const tip = steps[0]?.title?.replace(/^TIP:\s*/, '');
  const showStepCount = steps.length > 1;

  return (
    <div data-testid="device-remove-status" data-stage={stage}>
      <h4 data-testid="device-remove-title" className="text-base font-medium text-swift mb-2">
        {mode === RemovalMode.HUB_AUTOMATIC ? 'Removing Device...' : `Remove ${name}`}
      </h4>
      {tip && (
        <p data-testid="device-remove-tip" className="text-sm text-grouse mb-3">{tip}</p>
      )}
      <ol className="space-y-2 mb-3">
        {steps.map((step, i) => (
          <li
            key={step.id ?? i}
            data-testid={`device-remove-step-${i}`}
            className="flex gap-3 bg-pigeon rounded-[var(--border-radius-base)] p-3"
          >
            {showStepCount && (
              <span className="text-sm font-semibold text-peacock">{i + 1}</span>
            )}
            <div className="space-y-1">
              {step.instructions?.length ? (
                step.instructions.map((text, j) => (
                  <p key={j} className="text-sm text-swift">{text}</p>
                ))
              ) : (
                <p className="text-sm text-swift">
                  {step.info ?? 'The hub will beep when the device is successfully removed.'}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {mode === RemovalMode.HUB_MANUAL && (
        <p className="text-sm font-medium text-swift mb-3">This may take several minutes.</p>
      )}
      <p className="text-sm text-grouse animate-pulse mb-3">Waiting for the device to be removed…</p>
      {cancelButton}
    </div>
  );
}
