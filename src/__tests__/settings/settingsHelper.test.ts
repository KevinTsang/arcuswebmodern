import { CellBackupSubsystem, Place } from '@arcus/core';
import {
  formatCellBackupStatus, formatRole, formatServiceLevel, hasCellBackupAddon,
} from '@/components/settings/settingsHelper';

describe('formatServiceLevel', () => {
  it('formats known service levels', () => {
    expect(formatServiceLevel(Place.SERVICELEVEL_BASIC)).toBe('Basic');
    expect(formatServiceLevel(Place.SERVICELEVEL_PREMIUM)).toBe('Premium');
    expect(formatServiceLevel(Place.SERVICELEVEL_PREMIUM_FREE)).toBe('Premium (Free)');
    expect(formatServiceLevel(Place.SERVICELEVEL_PREMIUM_ANNUAL)).toBe('Premium Annual');
    expect(formatServiceLevel(Place.SERVICELEVEL_PREMIUM_PROMON)).toBe('Premium + Pro Monitoring');
    expect(formatServiceLevel(Place.SERVICELEVEL_PREMIUM_PROMON_FREE)).toBe('Premium + Pro Monitoring (Free)');
    expect(formatServiceLevel(Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL)).toBe('Premium + Pro Monitoring Annual');
  });

  it('returns raw value for unknown levels', () => {
    expect(formatServiceLevel('CUSTOM')).toBe('CUSTOM');
  });

  it('returns dash for null/undefined', () => {
    expect(formatServiceLevel(null)).toBe('—');
    expect(formatServiceLevel(undefined)).toBe('—');
  });
});

describe('formatRole', () => {
  it('formats known roles', () => {
    expect(formatRole('OWNER')).toBe('Owner');
    expect(formatRole('FULL_ACCESS')).toBe('Full Access');
    expect(formatRole('HOBBIT')).toBe('Partial Access');
  });

  it('returns raw value for unknown roles', () => {
    expect(formatRole('CUSTOM')).toBe('CUSTOM');
  });

  it('returns dash for empty role', () => {
    expect(formatRole('')).toBe('—');
  });
});

describe('hasCellBackupAddon', () => {
  it('is true only when the add-ons list cellular backup', () => {
    expect(hasCellBackupAddon([Place.SERVICEADDON_CELLBACKUP])).toBe(true);
    expect(hasCellBackupAddon(['OTHER'])).toBe(false);
    expect(hasCellBackupAddon([])).toBe(false);
    expect(hasCellBackupAddon(undefined)).toBe(false);
    expect(hasCellBackupAddon(null)).toBe(false);
  });
});

describe('formatCellBackupStatus', () => {
  it('formats active and ready', () => {
    expect(formatCellBackupStatus({ status: CellBackupSubsystem.STATUS_ACTIVE })).toBe('Active (on cellular)');
    expect(formatCellBackupStatus({ status: CellBackupSubsystem.STATUS_READY })).toBe('Ready');
  });

  it('explains why it is not ready', () => {
    const notReady = (notReadyState?: string) =>
      formatCellBackupStatus({ status: CellBackupSubsystem.STATUS_NOTREADY, notReadyState });
    expect(notReady(CellBackupSubsystem.NOTREADYSTATE_NEEDSSUB)).toBe('Not ready (add-on not in plan)');
    expect(notReady(CellBackupSubsystem.NOTREADYSTATE_NEEDSMODEM)).toBe('Not ready (no 4G modem)');
    expect(notReady(CellBackupSubsystem.NOTREADYSTATE_BOTH)).toBe('Not ready (add-on not in plan, no 4G modem)');
    expect(notReady(undefined)).toBe('Not ready');
    expect(notReady('UNKNOWN')).toBe('Not ready');
  });

  it('explains errors', () => {
    const errored = (errorState?: string) =>
      formatCellBackupStatus({ status: CellBackupSubsystem.STATUS_ERRORED, errorState });
    expect(errored(CellBackupSubsystem.ERRORSTATE_NOSIM)).toBe('Error (no SIM card)');
    expect(errored(CellBackupSubsystem.ERRORSTATE_NOTPROVISIONED)).toBe('Error (SIM not provisioned)');
    expect(errored(CellBackupSubsystem.ERRORSTATE_DISABLED)).toBe('Error (SIM disabled)');
    expect(errored(CellBackupSubsystem.ERRORSTATE_BANNED)).toBe('Error (cellular access blocked)');
    expect(errored(CellBackupSubsystem.ERRORSTATE_OTHER)).toBe('Error');
    expect(errored(undefined)).toBe('Error');
  });

  it('returns null for a missing or unknown status', () => {
    expect(formatCellBackupStatus({})).toBeNull();
    expect(formatCellBackupStatus({ status: 'SOMETHING' })).toBeNull();
  });
});
