'use client';

/**
 * DeviceRemovalSection — the Remove Device section of the device details panel.
 *
 * Renders the view for the current stage of the flow driven by
 * useDeviceRemoval: confirmation, the removal steps returned by dev:Remove
 * while waiting for the device to be deleted, and Force Remove once that wait
 * times out.
 *
 * Replaces src/components/device/remove-panel/remove-panel.stache.
 */

import type { DeviceRemovalFlow } from '@/components/pairing/types';
import { DeviceRemoveButton } from './DeviceRemoveButton';
import { DeviceRemoveConfirm } from './DeviceRemoveConfirm';
import { DeviceRemoveProgress } from './DeviceRemoveProgress';
import { DeviceRemoveTimedOut } from './DeviceRemoveTimedOut';
import { DeviceForceRemoveConfirm } from './DeviceForceRemoveConfirm';

interface DeviceRemovalSectionProps {
  name: string;
  removal: DeviceRemovalFlow;
}

export function DeviceRemovalSection({ name, removal }: DeviceRemovalSectionProps) {
  const { stage, mode, hubMode, steps, cancelling } = removal;

  switch (stage) {
    case 'idle':
      return <DeviceRemoveButton onClick={removal.requestRemove} />;
    case 'confirm':
    case 'requesting':
      return (
        <DeviceRemoveConfirm
          name={name}
          requesting={stage === 'requesting'}
          onConfirm={removal.remove}
          onDismiss={removal.dismissRemove}
        />
      );
    case 'removing':
      return (
        <DeviceRemoveProgress
          name={name}
          mode={mode}
          hubMode={hubMode}
          steps={steps}
          cancelling={cancelling}
          onCancel={removal.cancel}
        />
      );
    case 'timedOut':
      return (
        <DeviceRemoveTimedOut
          name={name}
          hubMode={hubMode}
          cancelling={cancelling}
          onForceRemove={removal.requestForceRemove}
          onCancel={removal.cancel}
        />
      );
    case 'confirmForce':
    case 'forcing':
      return (
        <DeviceForceRemoveConfirm
          name={name}
          forcing={stage === 'forcing'}
          onConfirm={removal.forceRemove}
          onBack={removal.dismissForceRemove}
        />
      );
  }
}
