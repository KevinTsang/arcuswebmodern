import {
  getSwitchInstances,
  formatInstanceName,
  isDeviceOn,
  getDeviceStatusText,
} from '@/hooks/useDeviceConfig';
import { resolveDeviceConfig } from '@/lib/deviceConfig';

// ── Fixtures ──────────────────────────────────────────────────────────

/** A dual-relay device like the Zooz ZEN17 */
function makeDualRelay(overrides: Record<string, unknown> = {}) {
  return {
    'base:caps': ['base', 'swit', 'devconn'],
    'base:instances': { relay1: ['swit'], relay2: ['swit'] },
    'dev:devtypehint': 'Switch',
    'devconn:state': 'ONLINE',
    'swit:state:relay1': 'ON',
    'swit:state:relay2': 'OFF',
    ...overrides,
  };
}

/** A dual-outlet device like the Zooz ZEN14 */
function makeDualOutlet(overrides: Record<string, unknown> = {}) {
  return {
    'base:caps': ['base', 'swit', 'devconn'],
    'base:instances': { outlet1: ['swit'], outlet2: ['swit'] },
    'dev:devtypehint': 'Switch',
    'devconn:state': 'ONLINE',
    'swit:state:outlet1': 'OFF',
    'swit:state:outlet2': 'OFF',
    ...overrides,
  };
}

/** A normal single-switch device */
function makeSingleSwitch(overrides: Record<string, unknown> = {}) {
  return {
    'base:caps': ['base', 'swit', 'devconn'],
    'dev:devtypehint': 'Switch',
    'devconn:state': 'ONLINE',
    'swit:state': 'ON',
    ...overrides,
  };
}

// ── getSwitchInstances ────────────────────────────────────────────────

describe('getSwitchInstances', () => {
  it('returns instance keys for a dual-relay device', () => {
    const device = makeDualRelay();
    expect(getSwitchInstances(device)).toEqual(['relay1', 'relay2']);
  });

  it('returns instance keys for a dual-outlet device', () => {
    const device = makeDualOutlet();
    expect(getSwitchInstances(device)).toEqual(['outlet1', 'outlet2']);
  });

  it('returns empty array for a single-switch device (no base:instances)', () => {
    const device = makeSingleSwitch();
    expect(getSwitchInstances(device)).toEqual([]);
  });

  it('returns empty array when base:instances has no swit capability', () => {
    const device = {
      'base:caps': ['base', 'temp'],
      'base:instances': { sensor1: ['temp'], sensor2: ['temp'] },
    };
    expect(getSwitchInstances(device)).toEqual([]);
  });

  it('only returns instances with swit capability (mixed)', () => {
    const device = {
      'base:caps': ['base', 'swit', 'temp'],
      'base:instances': { relay1: ['swit'], sensor1: ['temp'] },
      'swit:state:relay1': 'ON',
    };
    expect(getSwitchInstances(device)).toEqual(['relay1']);
  });
});

// ── formatInstanceName ────────────────────────────────────────────────

describe('formatInstanceName', () => {
  it('formats relay1 → Relay 1', () => {
    expect(formatInstanceName('relay1')).toBe('Relay 1');
  });

  it('formats outlet2 → Outlet 2', () => {
    expect(formatInstanceName('outlet2')).toBe('Outlet 2');
  });

  it('formats relay10 → Relay 10', () => {
    expect(formatInstanceName('relay10')).toBe('Relay 10');
  });

  it('capitalizes first letter of single-word keys', () => {
    expect(formatInstanceName('switch')).toBe('Switch');
  });
});

// ── isDeviceOn (multi-switch) ─────────────────────────────────────────

describe('isDeviceOn – multi-switch', () => {
  it('returns true if any instance is ON', () => {
    const device = makeDualRelay({ 'swit:state:relay1': 'ON', 'swit:state:relay2': 'OFF' });
    const config = resolveDeviceConfig(device);
    expect(isDeviceOn(device, config)).toBe(true);
  });

  it('returns false if all instances are OFF', () => {
    const device = makeDualRelay({ 'swit:state:relay1': 'OFF', 'swit:state:relay2': 'OFF' });
    const config = resolveDeviceConfig(device);
    expect(isDeviceOn(device, config)).toBe(false);
  });

  it('returns true if all instances are ON', () => {
    const device = makeDualRelay({ 'swit:state:relay1': 'ON', 'swit:state:relay2': 'ON' });
    const config = resolveDeviceConfig(device);
    expect(isDeviceOn(device, config)).toBe(true);
  });

  it('still works for single-switch devices', () => {
    const onDevice = makeSingleSwitch({ 'swit:state': 'ON' });
    const offDevice = makeSingleSwitch({ 'swit:state': 'OFF' });
    expect(isDeviceOn(onDevice, resolveDeviceConfig(onDevice))).toBe(true);
    expect(isDeviceOn(offDevice, resolveDeviceConfig(offDevice))).toBe(false);
  });
});

// ── getDeviceStatusText (multi-switch) ────────────────────────────────

describe('getDeviceStatusText – multi-switch', () => {
  it('shows per-instance status for dual relay', () => {
    const device = makeDualRelay({ 'swit:state:relay1': 'ON', 'swit:state:relay2': 'OFF' });
    const config = resolveDeviceConfig(device);
    expect(getDeviceStatusText(device, config)).toBe('Relay 1 On, Relay 2 Off');
  });

  it('shows all on for dual relay', () => {
    const device = makeDualRelay({ 'swit:state:relay1': 'ON', 'swit:state:relay2': 'ON' });
    const config = resolveDeviceConfig(device);
    expect(getDeviceStatusText(device, config)).toBe('Relay 1 On, Relay 2 On');
  });

  it('shows all off for dual outlet', () => {
    const device = makeDualOutlet();
    const config = resolveDeviceConfig(device);
    expect(getDeviceStatusText(device, config)).toBe('Outlet 1 Off, Outlet 2 Off');
  });

  it('still returns simple status for single-switch device', () => {
    const device = makeSingleSwitch({ 'swit:state': 'ON' });
    const config = resolveDeviceConfig(device);
    expect(getDeviceStatusText(device, config)).toBe('On');
  });
});
