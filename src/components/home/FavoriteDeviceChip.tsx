import Link from 'next/link';
import { Base, Device } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

const CHIP_CLASS =
  'flex-shrink-0 w-28 text-center p-2 border border-heron rounded-[var(--border-radius-base)] transition-colors hover:border-peacock hover:bg-pigeon/30 focus:outline-none focus:border-peacock';

/**
 * A favorite device on the dashboard — deep-links to the devices list, which
 * scrolls to and highlights this device via the `device` query param.
 */
export default function FavoriteDeviceChip({ device }: { device: DeviceEntity }) {
  const name = device[Device.ATTR_NAME] ?? 'Device';
  const href = `/devices?device=${encodeURIComponent(device[Base.ATTR_ADDRESS])}`;
  return (
    <Link href={href} data-testid={`favorite-device-${device[Base.ATTR_ADDRESS]}`} className={CHIP_CLASS} title={`View ${name} in Devices`}>
      <div className="w-10 h-10 bg-pigeon/50 rounded-full flex items-center justify-center mx-auto mb-1">
        <span className="icon-app-devices text-sm text-grouse" />
      </div>
      <p className="text-xs text-swift truncate">{name}</p>
    </Link>
  );
}
