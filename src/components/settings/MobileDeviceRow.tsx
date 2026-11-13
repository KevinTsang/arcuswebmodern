'use client';

import { useCallback } from 'react';
import { MobileDevice } from '@arcus/core';
import { mobileDeviceDetails, mobileDeviceTitle, type MobileDeviceData } from './mobileDevices';

interface MobileDeviceRowProps {
  device: MobileDeviceData;
  removing: boolean;
  onRemove: (device: MobileDeviceData) => void;
}

export default function MobileDeviceRow({ device, removing, onRemove }: MobileDeviceRowProps) {
  const index = device[MobileDevice.ATTR_DEVICEINDEX];
  const details = mobileDeviceDetails(device);

  const handleRemove = useCallback(() => onRemove(device), [onRemove, device]);

  return (
    <li data-testid={`mobile-device-${index}`} className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm text-swift truncate">{mobileDeviceTitle(device)}</p>
        {details && <p className="text-xs text-grouse truncate">{details}</p>}
      </div>
      <button
        onClick={handleRemove}
        disabled={removing}
        data-testid={`mobile-device-remove-${index}`}
        className="text-sm text-cardinal hover:underline disabled:opacity-50 shrink-0"
      >
        {removing ? 'Removing…' : 'Remove'}
      </button>
    </li>
  );
}
