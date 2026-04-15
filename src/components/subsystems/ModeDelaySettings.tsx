'use client';

/**
 * ModeDelaySettings — configure entrance/exit delays, arming sounds,
 * and silent alarm for a single alarm mode (ON or PARTIAL).
 */

import { useState, useCallback } from 'react';
import { Base, SecurityAlarmMode } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import SettingToggle from '../SettingToggle';

const DELAY_OPTIONS = [0, 15, 30, 45, 60, 90, 120, 180];

function formatDelay(seconds: number): string {
  if (seconds === 0) return 'None';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

interface ModeDelaySettingsProps {
  mode: 'ON' | 'PARTIAL';
  label: string;
  securityAddr: string;
  entranceDelaySec: number;
  exitDelaySec: number;
  soundsEnabled: boolean;
  silent: boolean;
}

export function ModeDelaySettings({ mode, label, securityAddr, entranceDelaySec, exitDelaySec, soundsEnabled, silent }: ModeDelaySettingsProps) {
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);

  const handleDelayChange = useCallback(async (attr: string, value: number) => {
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, securityAddr, {
        [`${attr}:${mode}`]: value,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update delay setting' }));
    }
    setSaving(false);
  }, [mode, securityAddr, dispatch]);

  const handleToggle = useCallback(async (attr: string, current: boolean) => {
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, securityAddr, {
        [`${attr}:${mode}`]: !current,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update setting' }));
    }
    setSaving(false);
  }, [mode, securityAddr, dispatch]);

  return (
    <div className="p-4 rounded-[var(--border-radius-base)] border border-heron">
      <h4 className="text-sm font-medium text-swift mb-3">{label}</h4>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-swift">Exit Delay</p>
            <p className="text-xs text-grouse">Time to exit before alarm arms.</p>
          </div>
          <select
            value={exitDelaySec}
            onChange={(e) => handleDelayChange(SecurityAlarmMode.ATTR_EXITDELAYSEC, Number(e.target.value))}
            disabled={saving}
            className="text-sm border border-heron rounded px-2 py-1 bg-crane text-swift disabled:opacity-50"
          >
            {DELAY_OPTIONS.map((s) => (
              <option key={s} value={s}>{formatDelay(s)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-swift">Entrance Delay</p>
            <p className="text-xs text-grouse">Grace period to disarm after entering.</p>
          </div>
          <select
            value={entranceDelaySec}
            onChange={(e) => handleDelayChange(SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC, Number(e.target.value))}
            disabled={saving}
            className="text-sm border border-heron rounded px-2 py-1 bg-crane text-swift disabled:opacity-50"
          >
            {DELAY_OPTIONS.map((s) => (
              <option key={s} value={s}>{formatDelay(s)}</option>
            ))}
          </select>
        </div>

        <SettingToggle
          label="Arming Sounds"
          description="Play sounds on hub/keypad during arming countdown."
          enabled={soundsEnabled}
          onToggle={() => handleToggle(SecurityAlarmMode.ATTR_SOUNDSENABLED, soundsEnabled)}
        />

        <SettingToggle
          label="Silent Alarm"
          description="Suppress siren when alarm triggers in this mode."
          enabled={silent}
          onToggle={() => handleToggle(SecurityAlarmMode.ATTR_SILENT, silent)}
        />
      </div>
    </div>
  );
}
