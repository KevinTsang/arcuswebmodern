'use client';

import { useMemo } from 'react';
import { Base, CellBackupSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllSubsystems } from '@/store/slices/subsystemsSlice';
import InfoRow from './InfoRow';
import { formatCellBackupStatus, hasCellBackupAddon, type CellBackupState } from './settingsHelper';

interface CellularBackupRowProps {
  /** place:serviceAddons of the place. */
  addons: string[] | undefined;
  /**
   * Whether the place is the session's active place. Only the active place's
   * subsystems are loaded, so only it can show the live modem status.
   */
  isActive: boolean;
}

/**
 * The place's Cellular Backup status: the live cellbackup subsystem status for
 * the active place, otherwise whether the plan includes the add-on.
 */
export default function CellularBackupRow({ addons, isActive }: CellularBackupRowProps) {
  const subsystems = useAppSelector(selectAllSubsystems);
  const state = useMemo<CellBackupState | null>(() => {
    if (!isActive) return null;
    const sub = subsystems.find((s) =>
      (s[Base.ATTR_ADDRESS] as string | undefined)?.startsWith(`SERV:${CellBackupSubsystem.NAMESPACE}:`));
    if (!sub) return null;
    return {
      status: sub[CellBackupSubsystem.ATTR_STATUS] as string | undefined,
      errorState: sub[CellBackupSubsystem.ATTR_ERRORSTATE] as string | undefined,
      notReadyState: sub[CellBackupSubsystem.ATTR_NOTREADYSTATE] as string | undefined,
    };
  }, [isActive, subsystems]);

  const live = state ? formatCellBackupStatus(state) : null;
  const value = live ?? (hasCellBackupAddon(addons) ? 'Included in plan' : 'Not included');

  return <InfoRow label="Cellular Backup" value={value} />;
}
