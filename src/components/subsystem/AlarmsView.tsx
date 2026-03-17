'use client';

/**
 * AlarmsView — alarm subsystem status and controls.
 *
 * Replaces src/components/subsystem/alarms/. Shows security alarm
 * state, arm/disarm controls, and device participation.
 */

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Device, DeviceConnection, SecuritySubsystem, AlarmSubsystem } from '@arcus/core';
import { useAlarmSubsystem } from '@/hooks/useSubsystem';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { addNotification } from '@/store/slices/uiSlice';

type AlarmView = 'status' | 'settings';

export function AlarmsView() {
  const [view, setView] = useState<AlarmView>('status');
  const alarm = useAlarmSubsystem();

  return (
    <div>
      {/* Sub-navigation */}
      <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-6 w-fit">
        <button
          onClick={() => setView('status')}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            view === 'status' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
          }`}
        >
          Status
        </button>
        <button
          onClick={() => setView('settings')}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            view === 'settings' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
          }`}
        >
          Settings
        </button>
      </div>

      {view === 'status' ? <AlarmStatus /> : <AlarmSettings />}
    </div>
  );
}

function AlarmStatus() {
  const dispatch = useAppDispatch();
  const alarm = useAlarmSubsystem();
  const allDevices = useAppSelector(selectAllDevices);
  const [arming, setArming] = useState(false);

  const securityDevices = allDevices.filter((d) =>
    alarm.securityDevices.includes(d[Base.ATTR_ADDRESS]),
  );
  const triggeredDevices = allDevices.filter((d) =>
    alarm.triggeredDevices.includes(d[Base.ATTR_ADDRESS]),
  );

  const handleArm = useCallback(async (mode: 'ON' | 'PARTIAL') => {
    if (!alarm.securitySubsystem) return;
    setArming(true);
    try {
      const addr = alarm.securitySubsystem[Base.ATTR_ADDRESS] as string;
      await Bridge.request('subsecurity:Arm', addr, { mode });
      dispatch(addNotification({ type: 'success', message: `Alarm ${mode === SecuritySubsystem.ALARMMODE_ON ? 'armed' : 'partially armed'}` }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to arm alarm' }));
    }
    setArming(false);
  }, [alarm.securitySubsystem, dispatch]);

  const handleDisarm = useCallback(async () => {
    if (!alarm.securitySubsystem) return;
    setArming(true);
    try {
      const addr = alarm.securitySubsystem[Base.ATTR_ADDRESS] as string;
      await Bridge.request('subsecurity:Disarm', addr, {});
      dispatch(addNotification({ type: 'success', message: 'Alarm disarmed' }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to disarm alarm' }));
    }
    setArming(false);
  }, [alarm.securitySubsystem, dispatch]);

  const stateLabel = {
    DISARMED: 'Disarmed',
    ARMING: 'Arming...',
    ARMED: 'Armed',
    ALERT: 'ALERT!',
    CLEARING: 'Clearing...',
    SOAKING: 'Entry Delay',
  }[alarm.securityState] ?? alarm.securityState;

  const isArmed = alarm.securityState === SecuritySubsystem.ALARMSTATE_ARMED;
  const isAlert = alarm.securityState === SecuritySubsystem.ALARMSTATE_ALERT;
  const isDisarmed = alarm.securityState === SecuritySubsystem.ALARMSTATE_DISARMED;

  return (
    <div className="space-y-6">
      {/* Alarm state */}
      <div className={`
        rounded-[var(--border-radius-base)] p-6 text-center
        ${isAlert ? 'bg-cardinal/10 border border-cardinal/30' :
          isArmed ? 'bg-honeycreeper/10 border border-honeycreeper/30' :
          'bg-pigeon border border-heron'}
      `}>
        <div className={`text-2xl font-bold mb-2 ${
          isAlert ? 'text-cardinal' : isArmed ? 'text-honeycreeper' : 'text-swift'
        }`}>
          {stateLabel}
        </div>
        <p className="text-sm text-grouse">
          {alarm.securityMode === SecuritySubsystem.ALARMMODE_ON ? 'Full' : alarm.securityMode === SecuritySubsystem.ALARMMODE_PARTIAL ? 'Partial' : ''}
          {securityDevices.length > 0 && ` \u00B7 ${securityDevices.length} device${securityDevices.length !== 1 ? 's' : ''}`}
        </p>

        {/* Triggered devices */}
        {triggeredDevices.length > 0 && (
          <div className="mt-3 text-sm text-cardinal">
            Triggered: {triggeredDevices.map((d) => (d[Device.ATTR_NAME] as string) ?? 'Unknown').join(', ')}
          </div>
        )}
      </div>

      {/* Arm/Disarm controls */}
      <div className="flex gap-3 justify-center">
        {isDisarmed ? (
          <>
            <button
              onClick={() => handleArm('ON')}
              disabled={arming}
              className="bg-peacock text-crane px-6 py-2.5 rounded-[var(--border-radius-base)] text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {arming ? 'Arming...' : 'Arm (Full)'}
            </button>
            <button
              onClick={() => handleArm('PARTIAL')}
              disabled={arming}
              className="border border-peacock text-peacock px-6 py-2.5 rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/5 disabled:opacity-50"
            >
              Arm (Partial)
            </button>
          </>
        ) : (
          <button
            onClick={handleDisarm}
            disabled={arming}
            className="bg-cardinal text-crane px-6 py-2.5 rounded-[var(--border-radius-base)] text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {arming ? 'Disarming...' : 'Disarm'}
          </button>
        )}
      </div>

      {/* Device list */}
      {securityDevices.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-swift mb-3">Security Devices</h3>
          <div className="space-y-2">
            {securityDevices.map((device) => {
              const name = (device[Device.ATTR_NAME] as string) ?? 'Unknown';
              const offline = (device[DeviceConnection.ATTR_STATE] as string) === DeviceConnection.STATE_OFFLINE;
              const triggered = alarm.triggeredDevices.includes(device[Base.ATTR_ADDRESS]);
              return (
                <div
                  key={device.id}
                  className={`flex items-center justify-between px-3 py-2 rounded border ${
                    triggered ? 'border-cardinal/30 bg-cardinal/5' :
                    offline ? 'border-heron bg-pigeon opacity-60' :
                    'border-heron'
                  }`}
                >
                  <span className="text-sm text-swift">{name}</span>
                  <span className={`text-xs ${
                    triggered ? 'text-cardinal font-medium' :
                    offline ? 'text-grouse' : 'text-honeycreeper'
                  }`}>
                    {triggered ? 'Triggered' : offline ? 'Offline' : 'Ready'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AlarmSettings() {
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

function SettingToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-heron">
      <div>
        <p className="text-sm font-medium text-swift">{label}</p>
        <p className="text-xs text-grouse mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-peacock' : 'bg-heron'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}
