'use client';

import { useAlarmSubsystem } from '@/hooks/useAlarmSubsystem';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { Base, Bridge, AlarmSubsystem } from '@arcus/core';
import { useCallback } from 'react';
import SettingToggle from '../SettingToggle';
import { AlarmNotificationList } from './AlarmNotificationList';
import { AlarmDeviceParticipation } from './AlarmDeviceParticipation';
import { AlarmDelaySettings } from './AlarmDelaySettings';

export function AlarmSettings() {
  const dispatch = useAppDispatch();
  const alarm = useAlarmSubsystem();

  const handleToggle = useCallback(async (attr: string, current: boolean) => {
    if (!alarm.alarmSubsystem) return;
    const addr = alarm.alarmSubsystem[Base.ATTR_ADDRESS] as string;
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, addr, { [attr]: !current });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update setting' }));
    }
  }, [alarm.alarmSubsystem, dispatch]);

  return (
    <div className="space-y-8 max-w-lg">
      {/* General settings */}
      <div>
        <h3 className="text-base font-medium text-swift mb-4">General</h3>
        <div className="space-y-4">
          <SettingToggle
            label="Record on Security Alarm"
            description="Record video from cameras when the security alarm is triggered."
            enabled={alarm.recordOnSecurity}
            onToggle={() => handleToggle(AlarmSubsystem.ATTR_RECORDONSECURITY, alarm.recordOnSecurity)}
          />
          <SettingToggle
            label="Fan Shutoff on Smoke"
            description="Automatically shut off fans when smoke is detected."
            enabled={alarm.fanShutoffOnSmoke}
            onToggle={() => handleToggle(AlarmSubsystem.ATTR_FANSHUTOFFONSMOKE, alarm.fanShutoffOnSmoke)}
          />
          <SettingToggle
            label="Fan Shutoff on CO"
            description="Automatically shut off fans when carbon monoxide is detected."
            enabled={alarm.fanShutoffOnCO}
            onToggle={() => handleToggle(AlarmSubsystem.ATTR_FANSHUTOFFONCO, alarm.fanShutoffOnCO)}
          />
        </div>
      </div>

      <hr className="border-heron" />

      {/* Notification list / call tree */}
      <AlarmNotificationList />

      <hr className="border-heron" />

      {/* Per-mode delay and sound settings */}
      <AlarmDelaySettings />

      <hr className="border-heron" />

      {/* Device participation */}
      <AlarmDeviceParticipation />
    </div>
  );
}
