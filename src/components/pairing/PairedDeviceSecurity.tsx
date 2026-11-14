'use client';

/**
 * PairedDeviceSecurity — the security result for a Z-Wave device that just paired.
 *
 * zwave-js recommends checking the result once a device is added and either
 * confirming it or warning the user, rather than leaving them to find a
 * downgrade later in device details. Shows nothing for other protocols, or
 * until the hub reports the device's security class.
 */

import { DeviceAdvanced } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectDeviceByAddress } from '@/store/slices/devicesSlice';
import { zwaveSecurityInfo, type ProtocolAttrs } from '@/lib/zwaveSecurity';
import { ZWaveSecurityNotice } from '@/components/devices/ZWaveSecurityNotice';

const ZWAVE_PROTOCOL = 'ZWAV';

interface PairedDeviceSecurityProps {
  /** `pairdev:deviceAddress` of the paired device. */
  deviceAddress: string;
}

export function PairedDeviceSecurity({ deviceAddress }: PairedDeviceSecurityProps) {
  const device = useAppSelector((s) => selectDeviceByAddress(s, deviceAddress));
  if (!device || device[DeviceAdvanced.ATTR_PROTOCOL] !== ZWAVE_PROTOCOL) return null;

  const security = zwaveSecurityInfo(device[DeviceAdvanced.ATTR_PROTOCOLATTRS] as ProtocolAttrs | undefined);
  if (!security) return null;

  return (
    <div data-testid="paired-device-security" className="mt-4 text-left">
      <ZWaveSecurityNotice security={security} confirm />
    </div>
  );
}
