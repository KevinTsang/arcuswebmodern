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
  value?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string; selectors?: SelectorDef[] }>;
}

export interface SelectorProps {
  sel: SelectorDef;
  current: unknown;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}
