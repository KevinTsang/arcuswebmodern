'use client';

import { Thermostat } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function ThermostatModeConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const mode = (device?.[Thermostat.ATTR_HVACMODE] as string) ?? Thermostat.HVACMODE_OFF;

  const modes = [Thermostat.HVACMODE_OFF, Thermostat.HVACMODE_HEAT, Thermostat.HVACMODE_COOL, Thermostat.HVACMODE_AUTO];

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">HVAC Mode</p>
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setAttribute(Thermostat.ATTR_HVACMODE, m)}
            data-testid={`hvac-mode-${m.toLowerCase()}`}
            className={`
              px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors
              ${mode === m
                ? 'bg-peacock text-crane'
                : 'bg-pigeon text-coot hover:bg-heron'}
            `}
          >
            {m === Thermostat.HVACMODE_OFF ? 'Off' : m === Thermostat.HVACMODE_HEAT ? 'Heat' : m === Thermostat.HVACMODE_COOL ? 'Cool' : 'Auto'}
          </button>
        ))}
      </div>
    </div>
  );
}
