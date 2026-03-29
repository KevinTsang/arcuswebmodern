export type SelectorValue = string | number | boolean;

export enum SelectorType {
  GROUP = 'GROUP',
  LIST = 'LIST',
  PERCENT = 'PERCENT',
  RANGE = 'RANGE',
  DURATION = 'DURATION',
  BOOLEAN = 'BOOLEAN',
  TEMPERATURE = 'TEMPERATURE',
  THERMOSTAT = 'THERMOSTAT',
}

export interface SelectorDef {
  type: SelectorType | string;
  name: string;
  value?: SelectorValue;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string; selectors?: SelectorDef[] }>;
}

export interface SelectorProps {
  sel: SelectorDef;
  current: SelectorValue | undefined;
  values: Record<string, SelectorValue>;
  onChange: (key: string, value: SelectorValue) => void;
}
