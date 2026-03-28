import { SelectorType, type SelectorDef } from './types';

/** Maps selector names to device attribute keys for reading live state. */
enum DeviceAttr {
  switch = 'swit:state',
  dim = 'dim:brightness',
  lockstate = 'doorlock:lockstate',
  doorState = 'motdoor:doorstate',
  fan = 'swit:state',
  fanspeed = 'fan:speed',
  ventlevel = 'vent:level',
  valvestate = 'valv:valvestate',
  mode = 'therm:hvacmode',
  heatsetpoint = 'therm:heatsetpoint',
  coolsetpoint = 'therm:coolsetpoint',
}

export function getDeviceValue(
  selName: string,
  device: Record<string, unknown>,
): unknown | undefined {
  // Special case: vent derives a state from a numeric level
  if (selName === 'vent') {
    const level = device['vent:level'] as number | undefined;
    return level !== undefined ? (level > 10 ? 'OPEN' : 'CLOSE') : undefined;
  }
  // Multi-switch instance keys: "switch:relay1" → "swit:state:relay1"
  if (selName.startsWith('switch:')) {
    const instanceKey = selName.slice('switch:'.length);
    return device[`swit:state:${instanceKey}`];
  }
  const attr = DeviceAttr[selName as keyof typeof DeviceAttr];
  if (attr && device[attr] !== undefined) return device[attr];
  return undefined;
}

export function getTypeFallback(sel: SelectorDef): unknown | undefined {
  switch (sel.type) {
    case SelectorType.GROUP:
    case SelectorType.LIST:
      return sel.options?.length ? sel.options[0].value : undefined;
    case SelectorType.PERCENT:
      return sel.min ?? 10;
    case SelectorType.RANGE:
    case SelectorType.DURATION:
      return sel.min ?? 0;
    case SelectorType.BOOLEAN:
      return false;
    case SelectorType.TEMPERATURE:
      return 20;
    default:
      return sel.value;
  }
}

export function getDefaultValues(
  selectors: SelectorDef[],
  device: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const sel of selectors) {
    if (device) {
      const live = getDeviceValue(sel.name, device);
      if (live !== undefined) {
        defaults[sel.name] = live;
        continue;
      }
    }
    const fallback = getTypeFallback(sel);
    if (fallback !== undefined) {
      defaults[sel.name] = fallback;
    }
  }
  return defaults;
}
