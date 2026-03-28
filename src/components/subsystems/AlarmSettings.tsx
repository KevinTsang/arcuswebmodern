import { useAlarmSubsystem } from "@/hooks/useSubsystem";
import { useAppDispatch } from "@/store/hooks";
import { addNotification } from "@/store/slices/uiSlice";
import { Base, Bridge, AlarmSubsystem } from "@arcus/core";
import { useCallback } from "react";
import SettingToggle from "../SettingToggle";

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
    <div className="space-y-4 max-w-lg">
      <h3 className="text-base font-medium text-swift mb-4">Alarm Settings</h3>

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
  );
}
