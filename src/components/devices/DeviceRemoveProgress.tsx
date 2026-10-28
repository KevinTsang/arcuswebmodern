'use client';

import { PairingDevice } from '@arcus/core';
import type { RemovalMode } from '@/arcus/types';
import type { PairingStep } from '@/components/pairing/types';
import { DeviceRemoveAbortButton } from './DeviceRemoveAbortButton';

interface DeviceRemoveProgressProps {
  name: string;
  mode: RemovalMode | null;
  hubMode: boolean;
  steps: PairingStep[];
  cancelling: boolean;
  onCancel: () => void;
}

/** The dev:Remove steps, shown while waiting for base:Deleted (`removing` stage). */
export function DeviceRemoveProgress({ name, mode, hubMode, steps, cancelling, onCancel }: DeviceRemoveProgressProps) {
  const tip = steps[0]?.title?.replace(/^TIP:\s*/, '');
  const showStepCount = steps.length > 1;
  // The platform's own default removal step uses the same wording.
  const defaultStepText = hubMode
    ? 'The hub will beep when the device is successfully removed.'
    : 'This should only take a moment.';

  return (
    <div data-testid="device-remove-status" data-stage="removing">
      <h4 data-testid="device-remove-title" className="text-base font-medium text-swift mb-2">
        {mode === PairingDevice.REMOVEMODE_HUB_AUTOMATIC ? 'Removing Device...' : `Remove ${name}`}
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
                <p className="text-sm text-swift">{step.info ?? defaultStepText}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {mode === PairingDevice.REMOVEMODE_HUB_MANUAL && (
        <p className="text-sm font-medium text-swift mb-3">This may take several minutes.</p>
      )}
      <p className="text-sm text-grouse animate-pulse mb-3">Waiting for the device to be removed…</p>
      <DeviceRemoveAbortButton hubMode={hubMode} cancelling={cancelling} onCancel={onCancel} />
    </div>
  );
}
