'use client';

/**
 * DeviceIcon — visual device icon with state-based styling.
 *
 * Replaces src/components/device/icon/. Renders the device icon
 * with conditional state classes (online/offline, on/off), text
 * display for thermostats, and radial indicators for dimmers.
 */

import { memo } from 'react';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceConfig, resolveDeviceIcon, isDeviceOffline } from '@/hooks/useDeviceConfig';

interface DeviceIconProps {
  address: string;
  size?: 'sm' | 'md' | 'lg';
}

function DeviceIconInner({ address, size = 'md' }: DeviceIconProps) {
  const device = useDevice(address);
  const config = useDeviceConfig(address);

  if (!device || !config) {
    return <div className={`${sizeClasses[size]} flex items-center justify-center text-heron`}>
      <span className="icon-app-devices text-2xl" />
    </div>;
  }

  const iconInfo = resolveDeviceIcon(device, config);
  const offline = isDeviceOffline(device);

  return (
    <div
      className={`
        ${sizeClasses[size]} flex items-center justify-center rounded-full relative
        ${offline ? 'bg-pigeon text-grouse' : 'bg-pigeon/50 text-swift'}
        ${iconInfo.stateClass.includes('is-on') && !offline ? 'ring-2 ring-peacock/30' : ''}
      `}
    >
      {iconInfo.showText ? (
        <span className={`font-bold ${size === 'lg' ? 'text-xl' : 'text-base'}`}>
          {iconInfo.textContent}&deg;
        </span>
      ) : (
        <span className={`${iconInfo.iconClass} ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base'}`} />
      )}

      {/* Radial indicator for dimmers */}
      {iconInfo.hasRadial && (
        <div
          className="absolute inset-0 rounded-full border-2 border-peacock"
          style={{ opacity: iconInfo.brightness / 100 }}
        />
      )}

      {/* Offline indicator */}
      {offline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cardinal border-2 border-crane" />
      )}
    </div>
  );
}

const sizeClasses: Record<string, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

export const DeviceIcon = memo(DeviceIconInner);
