import { Base, PairingDevice as PairingDeviceCap } from '@arcus/core';
import type { PairingDevice } from '@/store/entityTypes';

interface DeviceStateRowProps {
  device: PairingDevice;
  /** The record is left from an earlier pairing, not found by the current search. */
  earlier?: boolean;
}

export default function DeviceStateRow({ device, earlier = false }: DeviceStateRowProps) {
  const state = device[PairingDeviceCap.ATTR_PAIRINGSTATE];
  const phase = device[PairingDeviceCap.ATTR_PAIRINGPHASE];

  let statusText = 'Discovering…';
  let statusColor = 'text-grouse';

  if (state === PairingDeviceCap.PAIRINGSTATE_PAIRING) {
    switch (phase) {
      case PairingDeviceCap.PAIRINGPHASE_JOIN:
      case PairingDeviceCap.PAIRINGPHASE_CONNECT:
        statusText = 'Connecting…';
        break;
      case PairingDeviceCap.PAIRINGPHASE_IDENTIFY:
        statusText = 'Identifying…';
        break;
      case PairingDeviceCap.PAIRINGPHASE_PREPARE:
      case PairingDeviceCap.PAIRINGPHASE_CONFIGURE:
        statusText = 'Configuring…';
        break;
      case PairingDeviceCap.PAIRINGPHASE_PAIRED:
        statusText = 'Ready';
        statusColor = 'text-honeycreeper';
        break;
      default:
        statusText = 'Pairing…';
    }
  } else if (state === PairingDeviceCap.PAIRINGSTATE_PAIRED) {
    statusText = 'Paired';
    statusColor = 'text-honeycreeper';
  } else if (state === PairingDeviceCap.PAIRINGSTATE_MISPAIRED || state === PairingDeviceCap.PAIRINGSTATE_MISCONFIGURED) {
    statusText = 'Improperly Paired';
    statusColor = 'text-canary';
  }

  return (
    <div
      data-testid={`pairing-device-row-${device[Base.ATTR_ADDRESS]}`}
      data-earlier={earlier}
      className="flex items-center justify-between px-3 py-2 border border-heron rounded text-sm"
    >
      <span className="text-swift">{earlier ? 'From an earlier pairing' : 'Device Found'}</span>
      <span className={statusColor}>{statusText}</span>
    </div>
  );
}
