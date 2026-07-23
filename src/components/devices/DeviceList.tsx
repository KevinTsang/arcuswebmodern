'use client';

/**
 * DeviceList — container rendering a list of DevicePanels.
 *
 * Replaces src/components/device/list/. Renders all devices
 * as individual panels with optional filtering.
 *
 * Supports deep-linking: a `?device=<address>` query param (e.g. from the
 * dashboard favorites card) scrolls to and briefly highlights that device,
 * via the shared useDeepLinkHighlight hook.
 */

import { Base } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { useDeepLinkHighlight } from '@/hooks/useDeepLinkHighlight';
import { DevicePanel } from './DevicePanel';

export function DeviceList() {
  const devices = useAppSelector(selectAllDevices);
  const { highlighted, registerItem } = useDeepLinkHighlight('device', devices.length);

  if (devices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-grouse mb-2">No devices paired yet.</p>
        <p className="text-sm text-grouse">
          Use the Product Catalog to find and pair new devices.
        </p>
      </div>
    );
  }

  return (
    <div>
      {devices.map((device) => {
        const address = device[Base.ATTR_ADDRESS];
        return (
          <div
            key={device.id}
            data-device-address={address}
            ref={registerItem(address)}
            className={`rounded-[var(--border-radius-base)] transition-shadow ${
              highlighted === address ? 'ring-2 ring-peacock' : ''
            }`}
          >
            <DevicePanel address={address} />
          </div>
        );
      })}
    </div>
  );
}
