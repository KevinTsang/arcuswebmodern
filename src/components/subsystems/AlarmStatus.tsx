import { useAlarmSubsystem } from "@/hooks/useAlarmSubsystem";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAllDevices } from "@/store/slices/devicesSlice";
import { selectAllIncidents } from "@/store/slices/incidentsSlice";
import { addNotification } from "@/store/slices/uiSlice";
import { AlarmIncident, AlarmSubsystem, Base, Bridge, SecuritySubsystem, Device, DeviceConnection } from "@arcus/core";
import { useState, useCallback } from "react";
import IncidentTracker from "./IncidentTracker";

export function AlarmStatus() {
  const dispatch = useAppDispatch();
  const alarm = useAlarmSubsystem();
  const allDevices = useAppSelector(selectAllDevices);
  const incidents = useAppSelector(selectAllIncidents);
  const [arming, setArming] = useState(false);

  const activeIncident = incidents.find(
    (i) => i[AlarmIncident.ATTR_ALERTSTATE] === AlarmIncident.ALERTSTATE_ALERT
      || i[AlarmIncident.ATTR_ALERTSTATE] === AlarmIncident.ALERTSTATE_PREALERT,
  );

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
      await Bridge.request(SecuritySubsystem.CMD_ARM, addr, { mode });
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
      await Bridge.request(SecuritySubsystem.CMD_DISARM, addr, {});
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

  const handlePanic = useCallback(async () => {
    if (!alarm.alarmSubsystem) return;
    const addr = alarm.alarmSubsystem[Base.ATTR_ADDRESS] as string;
    try {
      await Bridge.request(AlarmSubsystem.CMD_PANIC, addr, {});
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to trigger panic alarm' }));
    }
  }, [alarm.alarmSubsystem, dispatch]);

  const isArmed = alarm.securityState === SecuritySubsystem.ALARMSTATE_ARMED;
  const isAlert = alarm.securityState === SecuritySubsystem.ALARMSTATE_ALERT;
  const isDisarmed = alarm.securityState === SecuritySubsystem.ALARMSTATE_DISARMED;

  return (
    <div className="space-y-6">
      {/* Active incident tracker */}
      {activeIncident && (
        <IncidentTracker incident={activeIncident} />
      )}

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

      {/* Panic button */}
      {!isAlert && (
        <div className="flex justify-center">
          <button
            onClick={handlePanic}
            className="border border-cardinal text-cardinal px-6 py-2 rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-cardinal/5"
          >
            Panic
          </button>
        </div>
      )}

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