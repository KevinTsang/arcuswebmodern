import { getDeviceValue, getTypeFallback, getDefaultValues } from '@/components/scenes/sceneDefaults';
import { SelectorType } from '@/components/scenes/types';
import type { SelectorDef } from '@/components/scenes/types';

// ── getDeviceValue ────────────────────────────────────────────────────

describe('getDeviceValue', () => {
  it('returns swit:state for switch selector', () => {
    expect(getDeviceValue('switch', { 'swit:state': 'ON' })).toBe('ON');
  });

  it('returns dim:brightness for dim selector', () => {
    expect(getDeviceValue('dim', { 'dim:brightness': 75 })).toBe(75);
  });

  it('returns doorlock:lockstate for lockstate selector', () => {
    expect(getDeviceValue('lockstate', { 'doorlock:lockstate': 'LOCKED' })).toBe('LOCKED');
  });

  it('returns motdoor:doorstate for doorState selector', () => {
    expect(getDeviceValue('doorState', { 'motdoor:doorstate': 'OPEN' })).toBe('OPEN');
  });

  it('returns swit:state for fan selector', () => {
    expect(getDeviceValue('fan', { 'swit:state': 'OFF' })).toBe('OFF');
  });

  it('returns fan:speed for fanspeed selector', () => {
    expect(getDeviceValue('fanspeed', { 'fan:speed': 3 })).toBe(3);
  });

  it('returns vent:level for ventlevel selector', () => {
    expect(getDeviceValue('ventlevel', { 'vent:level': 50 })).toBe(50);
  });

  it('returns valv:valvestate for valvestate selector', () => {
    expect(getDeviceValue('valvestate', { 'valv:valvestate': 'OPEN' })).toBe('OPEN');
  });

  it('returns therm:hvacmode for mode selector', () => {
    expect(getDeviceValue('mode', { 'therm:hvacmode': 'HEAT' })).toBe('HEAT');
  });

  it('returns therm:heatsetpoint for heatsetpoint selector', () => {
    expect(getDeviceValue('heatsetpoint', { 'therm:heatsetpoint': 21.5 })).toBe(21.5);
  });

  it('returns therm:coolsetpoint for coolsetpoint selector', () => {
    expect(getDeviceValue('coolsetpoint', { 'therm:coolsetpoint': 25 })).toBe(25);
  });

  it('returns OPEN for vent when level > 10', () => {
    expect(getDeviceValue('vent', { 'vent:level': 50 })).toBe('OPEN');
  });

  it('returns CLOSE for vent when level <= 10', () => {
    expect(getDeviceValue('vent', { 'vent:level': 5 })).toBe('CLOSE');
  });

  it('returns undefined for vent when vent:level is missing', () => {
    expect(getDeviceValue('vent', {})).toBeUndefined();
  });

  it('returns undefined when device attribute is missing', () => {
    expect(getDeviceValue('switch', {})).toBeUndefined();
  });

  it('returns undefined for unknown selector name', () => {
    expect(getDeviceValue('unknown', { 'some:attr': 'val' })).toBeUndefined();
  });

  it('returns per-instance switch state for multi-switch keys', () => {
    const device = { 'swit:state:relay1': 'ON', 'swit:state:relay2': 'OFF' };
    expect(getDeviceValue('switch:relay1', device)).toBe('ON');
    expect(getDeviceValue('switch:relay2', device)).toBe('OFF');
  });

  it('returns undefined for missing multi-switch instance', () => {
    expect(getDeviceValue('switch:relay3', { 'swit:state:relay1': 'ON' })).toBeUndefined();
  });
});

// ── getTypeFallback ───────────────────────────────────────────────────

describe('getTypeFallback', () => {
  it('returns first option value for GROUP', () => {
    const sel: SelectorDef = {
      type: SelectorType.GROUP,
      name: 'test',
      options: [{ label: 'On', value: 'ON' }, { label: 'Off', value: 'OFF' }],
    };
    expect(getTypeFallback(sel)).toBe('ON');
  });

  it('returns undefined for GROUP with no options', () => {
    const sel: SelectorDef = { type: SelectorType.GROUP, name: 'test', options: [] };
    expect(getTypeFallback(sel)).toBeUndefined();
  });

  it('returns first option value for LIST', () => {
    const sel: SelectorDef = {
      type: SelectorType.LIST,
      name: 'test',
      options: [{ label: 'Low', value: 'LOW' }, { label: 'High', value: 'HIGH' }],
    };
    expect(getTypeFallback(sel)).toBe('LOW');
  });

  it('returns min for PERCENT (custom min)', () => {
    const sel: SelectorDef = { type: SelectorType.PERCENT, name: 'test', min: 20 };
    expect(getTypeFallback(sel)).toBe(20);
  });

  it('returns 10 for PERCENT (default min)', () => {
    const sel: SelectorDef = { type: SelectorType.PERCENT, name: 'test' };
    expect(getTypeFallback(sel)).toBe(10);
  });

  it('returns min for RANGE (custom min)', () => {
    const sel: SelectorDef = { type: SelectorType.RANGE, name: 'test', min: 5 };
    expect(getTypeFallback(sel)).toBe(5);
  });

  it('returns 0 for RANGE (default min)', () => {
    const sel: SelectorDef = { type: SelectorType.RANGE, name: 'test' };
    expect(getTypeFallback(sel)).toBe(0);
  });

  it('returns min for DURATION', () => {
    const sel: SelectorDef = { type: SelectorType.DURATION, name: 'test', min: 30 };
    expect(getTypeFallback(sel)).toBe(30);
  });

  it('returns false for BOOLEAN', () => {
    const sel: SelectorDef = { type: SelectorType.BOOLEAN, name: 'test' };
    expect(getTypeFallback(sel)).toBe(false);
  });

  it('returns 20 for TEMPERATURE', () => {
    const sel: SelectorDef = { type: SelectorType.TEMPERATURE, name: 'test' };
    expect(getTypeFallback(sel)).toBe(20);
  });

  it('returns sel.value for unknown type', () => {
    const sel: SelectorDef = { type: 'CUSTOM', name: 'test', value: 'default' };
    expect(getTypeFallback(sel)).toBe('default');
  });

  it('returns undefined for unknown type with no value', () => {
    const sel: SelectorDef = { type: 'CUSTOM', name: 'test' };
    expect(getTypeFallback(sel)).toBeUndefined();
  });
});

// ── getDefaultValues ──────────────────────────────────────────────────

describe('getDefaultValues', () => {
  it('returns device live values when available', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.GROUP, name: 'switch', options: [{ label: 'On', value: 'ON' }, { label: 'Off', value: 'OFF' }] },
      { type: SelectorType.PERCENT, name: 'dim', min: 10 },
    ];
    const device = { 'swit:state': 'OFF', 'dim:brightness': 80 };
    expect(getDefaultValues(selectors, device)).toEqual({ switch: 'OFF', dim: 80 });
  });

  it('falls back to type defaults when device has no matching attribute', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.BOOLEAN, name: 'enabled' },
      { type: SelectorType.TEMPERATURE, name: 'temp' },
    ];
    const device = {};
    expect(getDefaultValues(selectors, device)).toEqual({ enabled: false, temp: 20 });
  });

  it('falls back to type defaults when no device provided', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.PERCENT, name: 'dim' },
      { type: SelectorType.RANGE, name: 'duration', min: 5 },
    ];
    expect(getDefaultValues(selectors, undefined)).toEqual({ dim: 10, duration: 5 });
  });

  it('mixes device values and fallbacks', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.GROUP, name: 'switch', options: [{ label: 'On', value: 'ON' }, { label: 'Off', value: 'OFF' }] },
      { type: SelectorType.BOOLEAN, name: 'notify' },
    ];
    const device = { 'swit:state': 'ON' };
    expect(getDefaultValues(selectors, device)).toEqual({ switch: 'ON', notify: false });
  });

  it('returns empty object for empty selectors', () => {
    expect(getDefaultValues([], { 'swit:state': 'ON' })).toEqual({});
  });

  it('skips selectors with unknown type and no value', () => {
    const selectors: SelectorDef[] = [
      { type: 'UNKNOWN', name: 'mystery' },
    ];
    expect(getDefaultValues(selectors, undefined)).toEqual({});
  });

  it('uses vent special case from device', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.GROUP, name: 'vent', options: [{ label: 'Open', value: 'OPEN' }, { label: 'Close', value: 'CLOSE' }] },
    ];
    const device = { 'vent:level': 50 };
    expect(getDefaultValues(selectors, device)).toEqual({ vent: 'OPEN' });
  });
});
