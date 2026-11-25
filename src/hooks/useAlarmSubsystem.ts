import { useMemo } from 'react';
import { SecuritySubsystem, AlarmSubsystem, SecurityAlarmMode } from '@arcus/core';
import { useSubsystem } from './useSubsystem';
import type { AlarmCallEntry } from '@/store/entityTypes';

export function useAlarmSubsystem() {
  const security = useSubsystem('subsecurity');
  const safety = useSubsystem('subsafety');
  const alarm = useSubsystem('subalarm');

  return useMemo(() => {
    const securityMode = (security?.[SecuritySubsystem.ATTR_ALARMMODE] as string) ?? SecuritySubsystem.ALARMMODE_OFF;
    const securityState = (security?.[SecuritySubsystem.ATTR_ALARMSTATE] as string) ?? SecuritySubsystem.ALARMSTATE_DISARMED;
    const currentIncident = security?.['subsecurity:currentIncident'] as string | undefined;
    const securityDevices = (security?.[SecuritySubsystem.ATTR_SECURITYDEVICES] as string[]) ?? [];
    const triggeredDevices = (security?.[SecuritySubsystem.ATTR_TRIGGEREDDEVICES] as string[]) ?? [];
    const offlineDevices = (security?.[SecuritySubsystem.ATTR_OFFLINEDEVICES] as string[]) ?? [];
    const callTree = (alarm?.[AlarmSubsystem.ATTR_CALLTREE] as AlarmCallEntry[]) ?? [];
    const fanShutoffOnSmoke = (alarm?.[AlarmSubsystem.ATTR_FANSHUTOFFONSMOKE] as boolean) ?? false;
    const fanShutoffOnCO = (alarm?.[AlarmSubsystem.ATTR_FANSHUTOFFONCO] as boolean) ?? false;

    // Per-mode settings — keyed by mode (ON, PARTIAL).
    // The platform stores these on the security subsystem entity as
    // 'subsecuritymode:devices:ON', 'subsecuritymode:exitDelaySec:ON', etc.
    const modeSettings = (['ON', 'PARTIAL'] as const).reduce((acc, mode) => {
      acc[mode] = {
        devices: (security?.[`${SecurityAlarmMode.ATTR_DEVICES}:${mode}`] as string[]) ?? [],
        entranceDelaySec: (security?.[`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:${mode}`] as number) ?? 30,
        exitDelaySec: (security?.[`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:${mode}`] as number) ?? 30,
        soundsEnabled: (security?.[`${SecurityAlarmMode.ATTR_SOUNDSENABLED}:${mode}`] as boolean) ?? true,
        silent: (security?.[`${SecurityAlarmMode.ATTR_SILENT}:${mode}`] as boolean) ?? false,
        alarmSensitivityDeviceCount: (security?.[`${SecurityAlarmMode.ATTR_ALARMSENSITIVITYDEVICECOUNT}:${mode}`] as number) ?? 1,
      };
      return acc;
    }, {} as Record<'ON' | 'PARTIAL', {
      devices: string[];
      entranceDelaySec: number;
      exitDelaySec: number;
      soundsEnabled: boolean;
      silent: boolean;
      alarmSensitivityDeviceCount: number;
    }>);

    return {
      securityMode,
      securityState,
      currentIncident,
      securityDevices,
      triggeredDevices,
      offlineDevices,
      callTree,
      modeSettings,
      fanShutoffOnSmoke,
      fanShutoffOnCO,
      securitySubsystem: security,
      safetySubsystem: safety,
      alarmSubsystem: alarm,
    };
  }, [security, safety, alarm]);
}
