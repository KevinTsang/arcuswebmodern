import { Thermostat } from '@arcus/core';
import { cToF } from '@/hooks/useDeviceConfig';
import type { SelectorValue } from './types';

interface ThermostatSelectorProps {
  name: string;
  values: Record<string, SelectorValue>;
  onChange: (key: string, value: SelectorValue) => void;
}

export function ThermostatSelector({ name, values, onChange }: ThermostatSelectorProps) {
  const mode = (values['mode'] as string) ?? Thermostat.HVACMODE_OFF;
  const heat = typeof values['heatsetpoint'] === 'number' ? values['heatsetpoint'] as number : 20;
  const cool = typeof values['coolsetpoint'] === 'number' ? values['coolsetpoint'] as number : 24;
  return (
    <div className="space-y-2">
      <span className="text-xs text-grouse block">{name}</span>
      <div className="flex flex-wrap gap-1">
        {[Thermostat.HVACMODE_OFF, Thermostat.HVACMODE_HEAT, Thermostat.HVACMODE_COOL, Thermostat.HVACMODE_AUTO].map((m) => (
          <button
            key={m}
            onClick={() => onChange('mode', m)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              mode === m ? 'bg-peacock text-crane border-peacock' : 'bg-crane text-swift border-heron hover:border-peacock'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      {(mode === Thermostat.HVACMODE_HEAT || mode === Thermostat.HVACMODE_AUTO) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-grouse w-12">Heat</span>
          <button onClick={() => onChange('heatsetpoint', Number((heat - 0.5556).toFixed(2)))} className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm">-</button>
          <span className="text-sm text-swift font-medium min-w-[3rem] text-center">{cToF(heat)}&deg;F</span>
          <button onClick={() => onChange('heatsetpoint', Number((heat + 0.5556).toFixed(2)))} className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm">+</button>
        </div>
      )}
      {(mode === Thermostat.HVACMODE_COOL || mode === Thermostat.HVACMODE_AUTO) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-grouse w-12">Cool</span>
          <button onClick={() => onChange('coolsetpoint', Number((cool - 0.5556).toFixed(2)))} className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm">-</button>
          <span className="text-sm text-swift font-medium min-w-[3rem] text-center">{cToF(cool)}&deg;F</span>
          <button onClick={() => onChange('coolsetpoint', Number((cool + 0.5556).toFixed(2)))} className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm">+</button>
        </div>
      )}
    </div>
  );
}
