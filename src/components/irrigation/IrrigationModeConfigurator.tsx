'use client';

import { useCallback, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { LawnNGardenSubsystem, type IrrigationScheduleModeValue } from '@arcus/core';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import { useSidePanel } from '@/components/SidePanel';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import {
  MANUAL_MODE_HELP, SCHEDULE_MODES, SCHEDULE_MODE_HELP, SCHEDULE_MODE_LABELS,
} from '@/lib/irrigation';
import { IrrigationSchedulePanel } from './IrrigationSchedulePanel';

interface IrrigationModeConfiguratorProps {
  address: string;
}

/** Radio value for "no schedule"; not a platform mode. */
const MANUAL = 'MANUAL';
type ModeChoice = IrrigationScheduleModeValue | typeof MANUAL;

/**
 * Choose which watering schedule a controller follows — weekly, interval,
 * even days, odd days — or none (manual). A mode can only be chosen once it
 * has at least one event. Replaces legacy
 * `device/configurators/irrigation-mode`.
 */
export function IrrigationModeConfigurator({ address }: IrrigationModeConfiguratorProps) {
  const { activeMode, eventsByMode, subsystemAddress } = useIrrigationController(address);
  const { openRight } = useSidePanel();
  const dispatch = useAppDispatch();
  const [pendingMode, setPendingMode] = useState<ModeChoice | null>(null);

  const current: ModeChoice = activeMode ?? MANUAL;
  const selected = pendingMode ?? current;

  const handleSelect = useCallback(async (mode: ModeChoice) => {
    if (mode === current || !subsystemAddress) return;
    setPendingMode(mode);
    try {
      if (mode === MANUAL) {
        await Bridge.request(LawnNGardenSubsystem.CMD_DISABLESCHEDULING, subsystemAddress, { controller: address });
      } else {
        await Bridge.request(LawnNGardenSubsystem.CMD_SWITCHSCHEDULEMODE, subsystemAddress, { controller: address, mode });
        await Bridge.request(LawnNGardenSubsystem.CMD_ENABLESCHEDULING, subsystemAddress, { controller: address });
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to change watering mode' }));
    } finally {
      setPendingMode(null);
    }
  }, [current, subsystemAddress, address, dispatch]);

  const handleEditSchedule = useCallback(() => {
    openRight(<IrrigationSchedulePanel address={address} />, { title: 'Watering Schedule', key: `irrigation-schedule:${address}` });
  }, [openRight, address]);

  const withEvents = SCHEDULE_MODES.filter((m) => eventsByMode[m].length > 0);
  const withoutEvents = SCHEDULE_MODES.filter((m) => eventsByMode[m].length === 0);

  const renderOption = (mode: ModeChoice, label: string, help: string, enabled: boolean) => (
    <label
      key={mode}
      className={`flex items-start gap-2 py-1 ${enabled ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
    >
      <input
        type="radio"
        name={`irrigation-mode-${address}`}
        data-testid={`irrigation-mode-${mode.toLowerCase()}`}
        className="mt-1"
        checked={enabled && selected === mode}
        disabled={!enabled || pendingMode !== null}
        onChange={() => handleSelect(mode)}
      />
      <span>
        <span className="block text-sm text-swift">{label}</span>
        <span className="block text-xs text-grouse">{help}</span>
      </span>
    </label>
  );

  return (
    <div data-testid="irrigation-mode">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-swift">Watering Mode</p>
        <button
          type="button"
          data-testid="irrigation-edit-schedule"
          onClick={handleEditSchedule}
          className="text-xs text-peacock hover:underline"
        >
          Edit Schedule
        </button>
      </div>
      <div>
        {withEvents.map((m) => renderOption(m, SCHEDULE_MODE_LABELS[m], SCHEDULE_MODE_HELP[m], true))}
        {renderOption(MANUAL, 'Manual', MANUAL_MODE_HELP, true)}
      </div>
      {withoutEvents.length > 0 && (
        <div className="mt-3">
          <p data-testid="irrigation-mode-needs-events" className="text-xs text-grouse mb-1">
            Add at least one scheduling event to enable the following mode(s).
          </p>
          {withoutEvents.map((m) => renderOption(m, SCHEDULE_MODE_LABELS[m], SCHEDULE_MODE_HELP[m], false))}
        </div>
      )}
    </div>
  );
}
