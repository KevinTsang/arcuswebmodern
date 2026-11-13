'use client';

/**
 * ThermostatScheduleButton — schedule summary row for a thermostat that
 * opens its HVAC schedule in the right side panel.
 */

import { useCallback } from 'react';
import { useSidePanel } from '@/components/SidePanel';
import { useThermostatScheduleStatus } from '@/hooks/useThermostatScheduleStatus';
import { ThermostatSchedulePanel } from './ThermostatSchedulePanel';

interface ThermostatScheduleButtonProps {
  address: string;
}

export function ThermostatScheduleButton({ address }: ThermostatScheduleButtonProps) {
  const { openRight } = useSidePanel();
  const { enabled, eventCount } = useThermostatScheduleStatus(address);

  const handleOpen = useCallback(() => {
    openRight(<ThermostatSchedulePanel address={address} />, {
      title: 'Schedule',
      key: `thermostat-schedule:${address}`,
    });
  }, [openRight, address]);

  const status = eventCount === 0
    ? 'No schedule'
    : `${enabled ? 'On' : 'Off'} · ${eventCount} ${eventCount === 1 ? 'event' : 'events'}`;

  return (
    <div className="flex items-center justify-between px-2 py-2 text-xs">
      <span className="text-grouse">
        Schedule: <span data-testid={`thermostat-schedule-status-${address}`} className="text-coot">{status}</span>
      </span>
      <button
        type="button"
        onClick={handleOpen}
        data-testid={`thermostat-schedule-open-${address}`}
        className="text-peacock font-medium hover:underline"
      >
        {eventCount === 0 ? 'Set Up Schedule' : 'Edit Schedule'}
      </button>
    </div>
  );
}
