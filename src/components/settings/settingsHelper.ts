import { CellBackupSubsystem, Place } from '@arcus/core';

export function formatServiceLevel(level: string | undefined | null): string {
  switch (level) {
    case Place.SERVICELEVEL_BASIC:
      return 'Basic';
    case Place.SERVICELEVEL_PREMIUM:
      return 'Premium';
    case Place.SERVICELEVEL_PREMIUM_FREE:
      return 'Premium (Free)';
    case Place.SERVICELEVEL_PREMIUM_ANNUAL:
      return 'Premium Annual';
    case Place.SERVICELEVEL_PREMIUM_PROMON:
      return 'Premium + Pro Monitoring';
    case Place.SERVICELEVEL_PREMIUM_PROMON_FREE:
      return 'Premium + Pro Monitoring (Free)';
    case Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL:
      return 'Premium + Pro Monitoring Annual';
    default:
      return level ?? '—';
  }
}

export function formatRole(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'FULL_ACCESS':
      return 'Full Access';
    case 'HOBBIT':
      return 'Partial Access';
    default:
      return role || '—';
  }
}

/** Whether the place's plan includes the Cellular Backup add-on (place:serviceAddons). */
export function hasCellBackupAddon(addons: string[] | undefined | null): boolean {
  return !!addons?.includes(Place.SERVICEADDON_CELLBACKUP);
}

/** The cellular backup subsystem's state, as read off the cellbackup subsystem. */
export interface CellBackupState {
  status?: string;
  errorState?: string;
  notReadyState?: string;
}

const NOT_READY_REASONS: { [state: string]: string } = {
  [CellBackupSubsystem.NOTREADYSTATE_NEEDSSUB]: 'add-on not in plan',
  [CellBackupSubsystem.NOTREADYSTATE_NEEDSMODEM]: 'no 4G modem',
  [CellBackupSubsystem.NOTREADYSTATE_BOTH]: 'add-on not in plan, no 4G modem',
};

const ERROR_REASONS: { [state: string]: string } = {
  [CellBackupSubsystem.ERRORSTATE_NOSIM]: 'no SIM card',
  [CellBackupSubsystem.ERRORSTATE_NOTPROVISIONED]: 'SIM not provisioned',
  [CellBackupSubsystem.ERRORSTATE_DISABLED]: 'SIM disabled',
  [CellBackupSubsystem.ERRORSTATE_BANNED]: 'cellular access blocked',
};

/**
 * A short label for the cellular backup subsystem's status (cellbackup:status
 * with its notReadyState / errorState reason), or null if the status is unknown.
 */
export function formatCellBackupStatus({ status, errorState, notReadyState }: CellBackupState): string | null {
  switch (status) {
    case CellBackupSubsystem.STATUS_ACTIVE:
      return 'Active (on cellular)';
    case CellBackupSubsystem.STATUS_READY:
      return 'Ready';
    case CellBackupSubsystem.STATUS_NOTREADY: {
      const reason = notReadyState ? NOT_READY_REASONS[notReadyState] : undefined;
      return reason ? `Not ready (${reason})` : 'Not ready';
    }
    case CellBackupSubsystem.STATUS_ERRORED: {
      const reason = errorState ? ERROR_REASONS[errorState] : undefined;
      return reason ? `Error (${reason})` : 'Error';
    }
    default:
      return null;
  }
}
