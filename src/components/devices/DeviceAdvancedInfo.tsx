/**
 * DeviceAdvancedInfo — power usage, signal strength and OTA firmware update
 * rows for the device detail panel. Renders `<dl>` children only; each row is
 * hidden when its attribute is unset (the device lacks that capability).
 */

import { DeviceConnection, DeviceOta, PowerUse } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';
import { clampPercent, formatOtaStatus, formatPowerUsage, formatSignal } from '@/lib/deviceAdvancedInfo';
import { DeviceInfoRow } from './DeviceInfoRow';

interface DeviceAdvancedInfoProps {
  device: DeviceEntity;
  offline: boolean;
}

export function DeviceAdvancedInfo({ device, offline }: DeviceAdvancedInfoProps) {
  const watts = device[PowerUse.ATTR_INSTANTANEOUS];
  // A signal reading is stale once the device drops off the network.
  const signal = offline ? undefined : device[DeviceConnection.ATTR_SIGNAL];
  const otaStatus = device[DeviceOta.ATTR_STATUS];
  const progress = device[DeviceOta.ATTR_PROGRESSPERCENT];
  const otaText = formatOtaStatus({
    status: otaStatus,
    targetVersion: device[DeviceOta.ATTR_TARGETVERSION],
    currentVersion: device[DeviceOta.ATTR_CURRENTVERSION],
    progressPercent: progress,
    retryCount: device[DeviceOta.ATTR_RETRYCOUNT],
    lastFailReason: device[DeviceOta.ATTR_LASTFAILREASON],
  });
  const showProgress = otaStatus === DeviceOta.STATUS_INPROGRESS && typeof progress === 'number';
  const progressPct = showProgress ? clampPercent(progress) : 0;

  return (
    <>
      {typeof watts === 'number' && (
        <DeviceInfoRow label="Power Usage" value={formatPowerUsage(watts)} />
      )}
      {typeof signal === 'number' && (
        <DeviceInfoRow label="Signal" value={formatSignal(signal)} />
      )}
      {otaText && (
        <DeviceInfoRow label="Firmware Update" value={otaText} />
      )}
      {showProgress && (
        <div
          role="progressbar"
          aria-label="Firmware update progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          data-testid="device-detail-firmware-progress"
          className="h-1.5 w-full bg-pigeon rounded-[var(--border-radius-base)] overflow-hidden"
        >
          <div className="h-full bg-peacock" style={{ width: `${progressPct}%` }} />
        </div>
      )}
    </>
  );
}
