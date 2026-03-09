import { cToF } from '@/hooks/useDeviceConfig';

interface ThermostatSelectorProps {
  name: string;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function ThermostatSelector({ name, values, onChange }: ThermostatSelectorProps) {
  const mode = (values['mode'] as string) ?? 'OFF';
  const heat = typeof values['heatsetpoint'] === 'number' ? values['heatsetpoint'] as number : 20;
  const cool = typeof values['coolsetpoint'] === 'number' ? values['coolsetpoint'] as number : 24;
  return (
    <div className="space-y-2">
      <span className="text-xs text-grouse block">{name}</span>
      <div className="flex flex-wrap gap-1">
        {['OFF', 'HEAT', 'COOL', 'AUTO'].map((m) => (
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
      {(mode === 'HEAT' || mode === 'AUTO') && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-grouse w-12">Heat</span>
          <button onClick={() => onChange('heatsetpoint', Number((heat - 0.5556).toFixed(2)))} className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm">-</button>
          <span className="text-sm text-swift font-medium min-w-[3rem] text-center">{cToF(heat)}&deg;F</span>
          <button onClick={() => onChange('heatsetpoint', Number((heat + 0.5556).toFixed(2)))} className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm">+</button>
        </div>
      )}
      {(mode === 'COOL' || mode === 'AUTO') && (
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
