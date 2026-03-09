import { SelectorType, type SelectorDef } from './types';
import { GroupSelector } from './GroupSelector';
import { ListSelector } from './ListSelector';
import { PercentSelector } from './PercentSelector';
import { RangeSelector } from './RangeSelector';
import { BooleanSelector } from './BooleanSelector';
import { TemperatureSelector } from './TemperatureSelector';
import { ThermostatSelector } from './ThermostatSelector';
import { FallbackSelector } from './FallbackSelector';

export { type SelectorDef, SelectorType } from './types';

function renderSelector(
  sel: SelectorDef,
  current: unknown,
  values: Record<string, unknown>,
  onChange: (key: string, value: unknown) => void,
) {
  const props = { sel, current, values, onChange };

  switch (sel.type) {
    case SelectorType.GROUP:
      if (!sel.options) break;
      return <GroupSelector key={sel.name} {...props} />;
    case SelectorType.LIST:
      if (!sel.options) break;
      return <ListSelector key={sel.name} {...props} />;
    case SelectorType.PERCENT:
      return <PercentSelector key={sel.name} {...props} />;
    case SelectorType.RANGE:
    case SelectorType.DURATION:
      return <RangeSelector key={sel.name} {...props} />;
    case SelectorType.BOOLEAN:
      return <BooleanSelector key={sel.name} name={sel.name} current={current} onChange={onChange} />;
    case SelectorType.TEMPERATURE:
      return <TemperatureSelector key={sel.name} name={sel.name} current={current} onChange={onChange} />;
    case SelectorType.THERMOSTAT:
      return <ThermostatSelector key={sel.name} name={sel.name} values={values} onChange={onChange} />;
  }
  return <FallbackSelector key={sel.name} name={sel.name} current={current} />;
}

export function SceneDeviceConfigurator({
  selectors,
  values,
  onChange,
  instanceLabels,
}: {
  selectors: SelectorDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  instanceLabels?: Record<string, string>;
}) {
  return (
    <div className="space-y-3 pl-2 border-l-2 border-pigeon ml-2 mt-2">
      {selectors.map((sel) => {
        const current = values[sel.name] ?? sel.value;
        const label = instanceLabels?.[sel.name];
        return (
          <div key={sel.name}>
            {label && <span className="text-xs font-medium text-grouse mb-1 block">{label}</span>}
            {renderSelector(sel, current, values, onChange)}
          </div>
        );
      })}
    </div>
  );
}
