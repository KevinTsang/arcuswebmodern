import { CellBackupSubsystem } from '@arcus/core';
import type { CellBackupAttributes } from './hubAdvancedTypes';

const NOT_READY_LABELS: { [state: string]: string } = {
  [CellBackupSubsystem.NOTREADYSTATE_NEEDSSUB]: 'Needs the Cellular Backup add-on',
  [CellBackupSubsystem.NOTREADYSTATE_NEEDSMODEM]: 'Needs a 4G modem in the hub',
  [CellBackupSubsystem.NOTREADYSTATE_BOTH]: 'Needs the Cellular Backup add-on and a 4G modem',
};

const ERROR_LABELS: { [state: string]: string } = {
  [CellBackupSubsystem.ERRORSTATE_NOSIM]: 'No SIM card in the modem',
  [CellBackupSubsystem.ERRORSTATE_NOTPROVISIONED]: 'SIM card not provisioned',
  [CellBackupSubsystem.ERRORSTATE_DISABLED]: 'SIM card disabled',
  [CellBackupSubsystem.ERRORSTATE_BANNED]: 'Cellular access suspended',
  [CellBackupSubsystem.ERRORSTATE_OTHER]: 'Cellular backup error',
};

/** One line describing the CellBackupSubsystem status. */
export function cellBackupStatusLabel(sub: CellBackupAttributes | undefined): string {
  switch (sub?.[CellBackupSubsystem.ATTR_STATUS]) {
    case CellBackupSubsystem.STATUS_ACTIVE:
      return 'In use';
    case CellBackupSubsystem.STATUS_READY:
      return 'Ready';
    case CellBackupSubsystem.STATUS_NOTREADY:
      return NOT_READY_LABELS[sub[CellBackupSubsystem.ATTR_NOTREADYSTATE] ?? ''] ?? 'Not ready';
    case CellBackupSubsystem.STATUS_ERRORED:
      return ERROR_LABELS[sub[CellBackupSubsystem.ATTR_ERRORSTATE] ?? ''] ?? 'Cellular backup error';
    default:
      return 'Unavailable';
  }
}
