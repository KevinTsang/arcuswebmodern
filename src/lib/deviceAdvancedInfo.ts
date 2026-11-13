/**
 * Formatting helpers for the advanced device info rows on the device detail
 * panel: instantaneous power usage (`pow`), signal strength (`devconn:signal`)
 * and over-the-air firmware update status (`devota`).
 */

import { DeviceOta } from '@arcus/core';

/** Format `pow:instantaneous` (watts). Small loads keep one decimal place. */
export function formatPowerUsage(watts: number): string {
  if (watts > 0 && watts < 10) {
    return `${Math.round(watts * 10) / 10} W`;
  }
  return `${Math.round(watts)} W`;
}

/** Round and clamp a percentage (`devconn:signal`, `devota:progressPercent`) to 0–100. */
export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Describe a `devconn:signal` percentage in words. */
export function signalQuality(signal: number): string {
  const pct = clampPercent(signal);
  if (pct >= 75) return 'Excellent';
  if (pct >= 50) return 'Good';
  if (pct >= 25) return 'Fair';
  return 'Poor';
}

/** Format `devconn:signal`, e.g. `Good (62%)`. */
export function formatSignal(signal: number): string {
  return `${signalQuality(signal)} (${clampPercent(signal)}%)`;
}

/** The `devota:*` attributes the firmware update row reads. */
export interface OtaStatusInfo {
  status?: string;
  targetVersion?: string;
  currentVersion?: string;
  progressPercent?: number;
  retryCount?: number;
  lastFailReason?: string;
}

/**
 * Describe the OTA firmware update state, or `null` when there is nothing to
 * report (no status, or `IDLE`).
 */
export function formatOtaStatus(info: OtaStatusInfo): string | null {
  switch (info.status) {
    case DeviceOta.STATUS_INPROGRESS: {
      const target = info.targetVersion ? ` to ${info.targetVersion}` : '';
      const progress = info.progressPercent != null
        ? ` (${clampPercent(info.progressPercent)}%)`
        : '';
      return `Updating${target}${progress}`;
    }
    case DeviceOta.STATUS_COMPLETED:
      return info.currentVersion ? `Updated to ${info.currentVersion}` : 'Update complete';
    case DeviceOta.STATUS_FAILED: {
      const retries = info.retryCount ? ` after ${info.retryCount} ${info.retryCount === 1 ? 'retry' : 'retries'}` : '';
      const reason = info.lastFailReason ? `: ${info.lastFailReason}` : '';
      return `Failed${retries}${reason}`;
    }
    default:
      return null;
  }
}
