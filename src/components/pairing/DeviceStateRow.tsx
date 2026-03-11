import type { PairingDevice } from './types';
import { PAIRING_STATES, PAIRING_PHASES } from './types';

interface DeviceStateRowProps {
  device: PairingDevice;
}

export default function DeviceStateRow({ device }: DeviceStateRowProps) {
  const state = device['pairdev:pairingState'];
  const phase = device['pairdev:pairingPhase'];

  let statusText = 'Discovering…';
  let statusColor = 'text-grouse';

  if (state === PAIRING_STATES.PAIRING) {
    switch (phase) {
      case PAIRING_PHASES.JOIN:
      case PAIRING_PHASES.CONNECT:
        statusText = 'Connecting…';
        break;
      case PAIRING_PHASES.IDENTIFY:
        statusText = 'Identifying…';
        break;
      case PAIRING_PHASES.PREPARE:
      case PAIRING_PHASES.CONFIGURE:
        statusText = 'Configuring…';
        break;
      case PAIRING_PHASES.PAIRED:
        statusText = 'Ready';
        statusColor = 'text-honeycreeper';
        break;
      default:
        statusText = 'Pairing…';
    }
  } else if (state === PAIRING_STATES.PAIRED) {
    statusText = 'Paired';
    statusColor = 'text-honeycreeper';
  } else if (state === PAIRING_STATES.MISPAIRED || state === PAIRING_STATES.MISCONFIGURED) {
    statusText = 'Improperly Paired';
    statusColor = 'text-canary';
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 border border-heron rounded text-sm">
      <span className="text-swift">Device Found</span>
      <span className={statusColor}>{statusText}</span>
    </div>
  );
}
