'use client';

import { useCallback, useState } from 'react';
import { MobileDevice } from '@arcus/core';
import type { MobileDeviceData } from './types';

interface MobileDeviceRowProps {
  device: MobileDeviceData;
  /** True while this device's removal is in flight. */
  removing: boolean;
  onRemove: (deviceIndex: number) => void;
}

/**
 * One mobile device that receives the person's push notifications. Removing
 * it asks for confirmation first, since the phone stops getting alerts.
 */
export function MobileDeviceRow({ device, removing, onRemove }: MobileDeviceRowProps) {
  const [confirming, setConfirming] = useState(false);
  const index = device[MobileDevice.ATTR_DEVICEINDEX];

  const os = [device[MobileDevice.ATTR_OSTYPE], device[MobileDevice.ATTR_OSVERSION]].filter(Boolean).join(' ');
  const model = [device[MobileDevice.ATTR_DEVICEVENDOR], device[MobileDevice.ATTR_DEVICEMODEL]].filter(Boolean).join(' ');
  const title = device[MobileDevice.ATTR_NAME] || os || 'Mobile device';

  const handleConfirm = useCallback(() => {
    setConfirming(false);
    onRemove(index);
  }, [index, onRemove]);

  return (
    <li data-testid={`mobile-device-${index}`} className="flex items-center justify-between gap-4 py-2 border-b border-heron last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-swift truncate">{title}</p>
        {title !== os && os && <p className="text-xs text-grouse">{os}</p>}
        {model && <p className="text-xs text-grouse">Device type: {model}</p>}
      </div>
      {confirming ? (
        <div className="flex gap-2 flex-shrink-0">
          <button
            data-testid={`mobile-device-${index}-confirm`}
            onClick={handleConfirm}
            className="text-sm text-cardinal hover:underline"
          >
            Remove
          </button>
          <button
            data-testid={`mobile-device-${index}-cancel`}
            onClick={() => setConfirming(false)}
            className="text-sm text-grouse hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          data-testid={`mobile-device-${index}-remove`}
          onClick={() => setConfirming(true)}
          disabled={removing}
          className="text-sm text-peacock hover:underline disabled:opacity-50 flex-shrink-0"
        >
          {removing ? 'Removing…' : 'Remove'}
        </button>
      )}
    </li>
  );
}
