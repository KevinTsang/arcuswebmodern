'use client';

/**
 * AlarmDelaySettings — renders per-mode delay/sound settings for
 * both ON and PARTIAL alarm modes.
 */

import { Base } from '@arcus/core';
import { useAlarmSubsystem } from '@/hooks/useAlarmSubsystem';
import { ModeDelaySettings } from './ModeDelaySettings';

export function AlarmDelaySettings() {
  const alarm = useAlarmSubsystem();
  const securityAddr = alarm.securitySubsystem?.[Base.ATTR_ADDRESS] as string | undefined;

  if (!securityAddr) {
    return null;
  }

  return (
    <div>
      <h3 className="text-base font-medium text-swift mb-1">Security Mode Settings</h3>
      <p className="text-xs text-grouse mb-3">
        Configure delays and sounds for each alarm mode.
      </p>
      <div className="space-y-4">
        <ModeDelaySettings
          mode="ON"
          label="Full (ON)"
          securityAddr={securityAddr}
          entranceDelaySec={alarm.modeSettings.ON.entranceDelaySec}
          exitDelaySec={alarm.modeSettings.ON.exitDelaySec}
          soundsEnabled={alarm.modeSettings.ON.soundsEnabled}
          silent={alarm.modeSettings.ON.silent}
        />
        <ModeDelaySettings
          mode="PARTIAL"
          label="Partial"
          securityAddr={securityAddr}
          entranceDelaySec={alarm.modeSettings.PARTIAL.entranceDelaySec}
          exitDelaySec={alarm.modeSettings.PARTIAL.exitDelaySec}
          soundsEnabled={alarm.modeSettings.PARTIAL.soundsEnabled}
          silent={alarm.modeSettings.PARTIAL.silent}
        />
      </div>
    </div>
  );
}
