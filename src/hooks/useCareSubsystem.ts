import { useMemo } from 'react';
import { CareSubsystem } from '@arcus/core';
import { useSubsystem } from './useSubsystem';
import type { CareBehavior, CareCallEntry } from '@/store/entityTypes';

export function useCareSubsystem() {
  const sub = useSubsystem('subcare');

  return useMemo(() => {
    const alarmState = (sub?.[CareSubsystem.ATTR_ALARMSTATE] as string) ?? CareSubsystem.ALARMSTATE_READY;
    const alarmMode = (sub?.[CareSubsystem.ATTR_ALARMMODE] as string) ?? CareSubsystem.ALARMMODE_ON;
    const behaviors = (sub?.[CareSubsystem.ATTR_BEHAVIORS] as CareBehavior[]) ?? [];
    const careDevices = (sub?.[CareSubsystem.ATTR_CAREDEVICES] as string[]) ?? [];
    const callTree = (sub?.[CareSubsystem.ATTR_CALLTREE] as CareCallEntry[]) ?? [];
    const lastAlertCause = sub?.[CareSubsystem.ATTR_LASTALERTCAUSE] as string | undefined;
    const silent = (sub?.[CareSubsystem.ATTR_SILENT] as boolean) ?? false;

    return {
      subsystem: sub,
      alarmState,
      alarmMode,
      behaviors,
      careDevices,
      callTree,
      lastAlertCause,
      silent,
    };
  }, [sub]);
}
