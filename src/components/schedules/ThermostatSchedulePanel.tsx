'use client';

/**
 * ThermostatSchedulePanel — side panel for a thermostat's HVAC schedule.
 *
 * Replaces the legacy thermostat schedule edit panel. Each HVAC mode (Heat,
 * Cool, Auto) has its own weekly program of setpoint events; the platform
 * follows the program matching the thermostat's current mode. "Follow
 * Schedule" enables/disables the program through the climate subsystem.
 */

import { useCallback, useMemo, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, ClimateSubsystem, Device } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useSubsystem } from '@/hooks/useSubsystem';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { ControlSwitch } from '@/components/shared/ControlSwitch';
import {
  THERMOSTAT_SCHEDULE_MODE_LABELS,
  defaultScheduleAttributes,
  describeThermostatCommand,
  initialScheduleMode,
  setpointLimits,
  thermostatScheduleModes,
  type ThermostatScheduleDevice,
} from '@/lib/thermostatSchedule';
import { ScheduleEditPanel } from './ScheduleEditPanel';
import { ThermostatScheduleSetpoints } from './ThermostatScheduleSetpoints';
import type { ScheduleAttributeEditorProps } from './types';
import { useThermostatScheduleStatus } from '@/hooks/useThermostatScheduleStatus';

interface ThermostatSchedulePanelProps {
  address: string;
}

interface PlatformError {
  code?: string;
}

export function ThermostatSchedulePanel({ address }: ThermostatSchedulePanelProps) {
  const dispatch = useAppDispatch();
  const device = useDevice(address) as (ThermostatScheduleDevice & { [Device.ATTR_NAME]?: string }) | undefined;
  const climate = useSubsystem('subclimate');
  const { enabled } = useThermostatScheduleStatus(address);
  const [toggling, setToggling] = useState(false);

  const name = device?.[Device.ATTR_NAME] ?? 'Thermostat';
  const modes = useMemo(() => thermostatScheduleModes(device), [device]);
  // Pick the starting tab once, from the mode the thermostat is in when opened.
  const [initialMode] = useState(() => initialScheduleMode(device, modes));
  const limits = useMemo(() => setpointLimits(device), [device]);
  const defaultAttributes = useMemo(() => defaultScheduleAttributes(device), [device]);

  const renderSetpoints = useCallback(
    (props: ScheduleAttributeEditorProps) => <ThermostatScheduleSetpoints {...props} limits={limits} />,
    [limits],
  );

  const handleToggleFollow = useCallback(
    async (follow: boolean) => {
      const climateAddress = climate?.[Base.ATTR_ADDRESS];
      if (!climateAddress) {
        dispatch(addNotification({ type: 'error', message: 'Climate service is unavailable.' }));
        return;
      }
      setToggling(true);
      try {
        await Bridge.request(
          follow ? ClimateSubsystem.CMD_ENABLESCHEDULER : ClimateSubsystem.CMD_DISABLESCHEDULER,
          climateAddress,
          { thermostat: address },
        );
      } catch (err) {
        const code = (err as PlatformError | undefined)?.code;
        dispatch(addNotification({
          type: 'error',
          message: code === 'timezone.notset'
            ? 'Set a time zone for this place before turning on the schedule.'
            : `Failed to turn ${follow ? 'on' : 'off'} the schedule.`,
        }));
      } finally {
        setToggling(false);
      }
    },
    [climate, address, dispatch],
  );

  if (!device) {
    return (
      <p data-testid="thermostat-schedule-missing" className="text-sm text-grouse">
        This thermostat is no longer available.
      </p>
    );
  }

  return (
    <div data-testid="thermostat-schedule-panel" className="space-y-4">
      <p className="text-sm text-coot">
        Automating thermostats can lower your energy usage. Each mode has its own
        program: the thermostat follows the one matching its current mode. Choose a
        mode, then click &lsquo;Add Event&rsquo; to set a temperature, time and days.
      </p>

      <div className="flex items-center justify-between border border-heron rounded-[var(--border-radius-base)] px-4 py-3">
        <span className="text-sm font-medium text-swift">Follow Schedule</span>
        <ControlSwitch
          checked={enabled}
          onChange={handleToggleFollow}
          disabled={toggling}
          testId="thermostat-schedule-follow"
        />
      </div>
      {!enabled && (
        <p data-testid="thermostat-schedule-off" className="text-xs text-grouse">
          The schedule for this thermostat is off. Its events won&rsquo;t change the temperature.
        </p>
      )}

      <ScheduleEditPanel
        targetAddress={address}
        targetName={name}
        scheduleId={initialMode}
        messageType={Base.CMD_SETATTRIBUTES}
        modes={modes}
        modeLabels={THERMOSTAT_SCHEDULE_MODE_LABELS}
        renderAttributeEditor={renderSetpoints}
        defaultAttributes={defaultAttributes}
        describeEvent={describeThermostatCommand}
      />
    </div>
  );
}
