import { DeviceOta } from '@arcus/core';
import {
  clampPercent, formatOtaStatus, formatPowerUsage, formatSignal, signalQuality,
} from '@/lib/deviceAdvancedInfo';

describe('formatPowerUsage', () => {
  it.each([
    [0, '0 W'],
    [0.44, '0.4 W'],
    [4.56, '4.6 W'],
    [9.99, '10 W'],
    [10, '10 W'],
    [60.4, '60 W'],
    [1499.6, '1500 W'],
  ])('formats %p watts as %p', (watts, text) => {
    expect(formatPowerUsage(watts)).toBe(text);
  });
});

describe('clampPercent', () => {
  it.each([
    [-5, 0],
    [0, 0],
    [49.6, 50],
    [100, 100],
    [140, 100],
  ])('clamps %p to %p', (value, pct) => {
    expect(clampPercent(value)).toBe(pct);
  });
});

describe('signalQuality / formatSignal', () => {
  it.each([
    [100, 'Excellent', 'Excellent (100%)'],
    [75, 'Excellent', 'Excellent (75%)'],
    [74, 'Good', 'Good (74%)'],
    [50, 'Good', 'Good (50%)'],
    [49, 'Fair', 'Fair (49%)'],
    [25, 'Fair', 'Fair (25%)'],
    [24, 'Poor', 'Poor (24%)'],
    [0, 'Poor', 'Poor (0%)'],
    [130, 'Excellent', 'Excellent (100%)'],
    [-10, 'Poor', 'Poor (0%)'],
  ])('describes %p as %p', (signal, quality, text) => {
    expect(signalQuality(signal)).toBe(quality);
    expect(formatSignal(signal)).toBe(text);
  });
});

describe('formatOtaStatus', () => {
  it('returns null without a status', () => {
    expect(formatOtaStatus({})).toBeNull();
  });

  it('returns null when idle', () => {
    expect(formatOtaStatus({ status: DeviceOta.STATUS_IDLE, progressPercent: 0 })).toBeNull();
  });

  it('returns null for an unknown status', () => {
    expect(formatOtaStatus({ status: 'BOGUS' })).toBeNull();
  });

  it('describes an update in progress with target and progress', () => {
    expect(formatOtaStatus({
      status: DeviceOta.STATUS_INPROGRESS, targetVersion: '2.0.1', progressPercent: 42.4,
    })).toBe('Updating to 2.0.1 (42%)');
  });

  it('describes an update in progress without target or progress', () => {
    expect(formatOtaStatus({ status: DeviceOta.STATUS_INPROGRESS })).toBe('Updating');
  });

  it('clamps out-of-range progress', () => {
    expect(formatOtaStatus({ status: DeviceOta.STATUS_INPROGRESS, progressPercent: 120 }))
      .toBe('Updating (100%)');
  });

  it('describes a completed update', () => {
    expect(formatOtaStatus({ status: DeviceOta.STATUS_COMPLETED, currentVersion: '2.0.1' }))
      .toBe('Updated to 2.0.1');
    expect(formatOtaStatus({ status: DeviceOta.STATUS_COMPLETED })).toBe('Update complete');
  });

  it('describes a failed update with retries and reason', () => {
    expect(formatOtaStatus({
      status: DeviceOta.STATUS_FAILED, retryCount: 3, lastFailReason: 'Checksum mismatch',
    })).toBe('Failed after 3 retries: Checksum mismatch');
    expect(formatOtaStatus({ status: DeviceOta.STATUS_FAILED, retryCount: 1 }))
      .toBe('Failed after 1 retry');
    expect(formatOtaStatus({ status: DeviceOta.STATUS_FAILED, retryCount: 0 })).toBe('Failed');
  });
});
