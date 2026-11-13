'use client';

import { HoneywellTCC, NestThermostat } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { formatTemp } from '@/hooks/useDeviceConfig';
import { resolveDeviceConfig } from '@/lib/deviceConfig';
import { isAutoSupported, isHoneywellTcc, isNestThermostat } from '@/lib/thermostat';

/**
 * Cloud-thermostat details for the device detail panel: Nest room and
 * temperature lock, and Honeywell Total Connect Comfort account status.
 * Renders nothing for other devices.
 */
export function ThermostatIntegrationDetails({ address }: { address: string }) {
  const device = useDevice(address);
  if (!device) return null;

  if (isNestThermostat(device)) {
    const room = device[NestThermostat.ATTR_ROOMNAME] as string | undefined;
    const locked = device[NestThermostat.ATTR_LOCKED] === true;
    const lockMin = device[NestThermostat.ATTR_LOCKEDTEMPMIN] as number | undefined;
    const lockMax = device[NestThermostat.ATTR_LOCKEDTEMPMAX] as number | undefined;
    return (
      <div data-testid="thermostat-nest-details" className="mb-8 space-y-3">
        <p className="text-sm text-grouse">Manage these settings on your Nest thermostat or in the Nest mobile app.</p>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-grouse">Room</dt>
            <dd data-testid="thermostat-nest-room" className="text-sm text-swift text-right">{room || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-grouse">Temperature Lock</dt>
            <dd data-testid="thermostat-nest-lock" className="text-sm text-swift text-right">
              {locked ? `On (${formatTemp(lockMin)}° - ${formatTemp(lockMax)}°)` : 'Off'}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  if (isHoneywellTcc(device)) {
    const requiresLogin = device[HoneywellTCC.ATTR_REQUIRESLOGIN] === true;
    const deauthorized = device[HoneywellTCC.ATTR_AUTHORIZATIONSTATE] === HoneywellTCC.AUTHORIZATIONSTATE_DEAUTHORIZED;
    const autoDescription = resolveDeviceConfig(device)['web:therm:autoDescription'];
    const account = requiresLogin
      ? 'Honeywell login information needs attention.'
      : deauthorized
        ? 'Honeywell account information revoked.'
        : null;
    if (!account && isAutoSupported(device)) return null;
    return (
      <div data-testid="thermostat-tcc-details" className="mb-8 space-y-3">
        {account && (
          <p data-testid="thermostat-tcc-account" className="text-sm text-cardinal">{account}</p>
        )}
        {!isAutoSupported(device) && (
          <div>
            <p className="text-sm font-medium text-swift">{autoDescription} Mode</p>
            <p className="text-xs text-grouse mt-1">
              To use {autoDescription} mode on your thermostat, Honeywell requires you to first enable
              the {autoDescription} mode setting on the device. Check the Honeywell owner&apos;s manual for details.
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
