'use client';

import { useCallback } from 'react';
import { Thermostat } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function ThermostatControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);

  const mode = (device?.[Thermostat.ATTR_HVACMODE] as string) ?? Thermostat.HVACMODE_OFF;
  const heatSp = device?.[Thermostat.ATTR_HEATSETPOINT] as number | undefined;
  const coolSp = device?.[Thermostat.ATTR_COOLSETPOINT] as number | undefined;

  // Celsius to Fahrenheit for display
  const toF = (c: number) => Math.round(c * 9 / 5 + 32);
  const toC = (f: number) => (f - 32) * 5 / 9;

  const handleHeatChange = useCallback(
    (delta: number) => {
      if (heatSp == null) return;
      const newF = toF(heatSp) + delta;
      setAttribute(Thermostat.ATTR_HEATSETPOINT, toC(newF));
    },
    [heatSp, setAttribute],
  );

  const handleCoolChange = useCallback(
    (delta: number) => {
      if (coolSp == null) return;
      const newF = toF(coolSp) + delta;
      setAttribute(Thermostat.ATTR_COOLSETPOINT, toC(newF));
    },
    [coolSp, setAttribute],
  );

  if (mode === Thermostat.HVACMODE_OFF) {
    return <span className="text-sm text-grouse">Off</span>;
  }

  return (
    <div className="flex items-center gap-3">
      {(mode === Thermostat.HVACMODE_HEAT || mode === Thermostat.HVACMODE_AUTO) && heatSp != null && (
        <div className="flex items-center gap-1">
          <button onClick={() => handleHeatChange(-1)} data-testid={`thermostat-heat-down-${address}`} className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron">-</button>
          <span data-testid={`thermostat-heat-value-${address}`} className="text-sm font-medium text-cardinal w-10 text-center">{toF(heatSp)}&deg;</span>
          <button onClick={() => handleHeatChange(1)} data-testid={`thermostat-heat-up-${address}`} className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron">+</button>
        </div>
      )}
      {mode === Thermostat.HVACMODE_AUTO && <span className="text-grouse text-xs">to</span>}
      {(mode === Thermostat.HVACMODE_COOL || mode === Thermostat.HVACMODE_AUTO) && coolSp != null && (
        <div className="flex items-center gap-1">
          <button onClick={() => handleCoolChange(-1)} data-testid={`thermostat-cool-down-${address}`} className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron">-</button>
          <span data-testid={`thermostat-cool-value-${address}`} className="text-sm font-medium text-peacock w-10 text-center">{toF(coolSp)}&deg;</span>
          <button onClick={() => handleCoolChange(1)} data-testid={`thermostat-cool-up-${address}`} className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron">+</button>
        </div>
      )}
    </div>
  );
}
