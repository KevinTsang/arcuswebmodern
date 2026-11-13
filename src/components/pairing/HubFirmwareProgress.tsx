'use client';

/**
 * HubFirmwareProgress — firmware download/apply progress shown while a hub
 * registers (place:RegisterHubV2 reports DOWNLOADING or APPLYING).
 *
 * Ported from the legacy pairing/connect/hub DOWNLOADING and APPLYING states.
 */

import { ProgressBar } from '@/components/shared/ProgressBar';
import { HubFirmwareState, type HubFirmwareStateValue } from '@/lib/hubFirmware';

interface HubFirmwareProgressProps {
  state: HubFirmwareStateValue;
  /** 0–100 percentage reported by the platform. */
  percent: number;
}

interface FirmwarePhaseCopy {
  title: string;
  label: string;
  body: string;
}

const COPY: Record<HubFirmwareStateValue, FirmwarePhaseCopy> = {
  [HubFirmwareState.DOWNLOADING]: {
    title: 'Update Available',
    label: 'Downloading firmware update…',
    body: 'Your Smart Hub is downloading the latest firmware. This may take 5-10 minutes depending on the speed of your internet connection. Once the update is installed, the Hub will reboot automatically.',
  },
  [HubFirmwareState.APPLYING]: {
    title: 'Applying Update…',
    label: 'Applying firmware update…',
    body: 'Your Smart Hub is applying the latest firmware. This may take a few minutes and it will reboot. It is normal for the Hub to flash several lights during the reboot process.',
  },
};

export function HubFirmwareProgress({ state, percent }: HubFirmwareProgressProps) {
  const copy = COPY[state];

  return (
    <div data-testid="hub-firmware-progress" data-state={state} data-percent={percent} className="text-left">
      <h4 data-testid="hub-firmware-title" className="text-sm font-semibold text-swift mb-2 text-center">
        {copy.title}
      </h4>
      <div className="mb-3">
        <ProgressBar percent={percent} label={copy.label} />
      </div>
      <p className="text-sm text-grouse mb-2">{copy.body}</p>
      <p data-testid="hub-firmware-warning" className="text-xs text-coot font-medium">
        Please do not leave this page until the update is complete.
      </p>
    </div>
  );
}
