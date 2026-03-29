import { cToF } from '@/hooks/useDeviceConfig';
import type { SelectorValue } from './types';

interface TemperatureSelectorProps {
  name: string;
  current: SelectorValue | undefined;
  onChange: (key: string, value: SelectorValue) => void;
}

export function TemperatureSelector({ name, current, onChange }: TemperatureSelectorProps) {
  const celsiusVal = typeof current === 'number' ? current : 20;
  const fahrenheit = cToF(celsiusVal);
  return (
    <div>
      <span className="text-xs text-grouse block mb-1">{name}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(name, Number((celsiusVal - 0.5556).toFixed(2)))}
          className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm"
        >-</button>
        <span className="text-sm text-swift font-medium min-w-[3rem] text-center">{fahrenheit}&deg;F</span>
        <button
          onClick={() => onChange(name, Number((celsiusVal + 0.5556).toFixed(2)))}
          className="w-7 h-7 rounded border border-heron text-swift hover:bg-pigeon text-sm"
        >+</button>
      </div>
    </div>
  );
}
