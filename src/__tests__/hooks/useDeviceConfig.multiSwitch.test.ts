import { Base, Device, DeviceConnection, Switch } from '@arcus/core';
import {
  getSwitchInstances,
  formatInstanceName,
  isDeviceOn,
  getDeviceStatusText,
} from '@/hooks/useDeviceConfig';
import { resolveDeviceConfig } from '@/lib/deviceConfig';
import type { DeviceEntity } from '@/store/entityTypes';

// ── Fixtures ──────────────────────────────────────────────────────────

/** A dual-relay device like the Zooz ZEN17 */
function makeDualRelay(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return {
    id: 'DRIV:dev:dual-relay-1',
    [Base.ATTR_ADDRESS]: 'DRIV:dev:dual-relay-1',
    [Base.ATTR_CAPS]: ['base', 'swit', 'devconn'],
    [Base.ATTR_INSTANCES]: { relay1: ['swit'], relay2: ['swit'] },
    [Device.ATTR_DEVTYPEHINT]: 'Switch',
    [DeviceConnection.ATTR_STATE]: 'ONLINE',
    [`${Switch.ATTR_STATE}:relay1`]: Switch.STATE_ON,
    [`${Switch.ATTR_STATE}:relay2`]: Switch.STATE_OFF,
    ...overrides,
  };
}

/** A dual-outlet device like the Zooz ZEN14 */
function makeDualOutlet(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return {
    id: 'DRIV:dev:dual-outlet-1',
    [Base.ATTR_ADDRESS]: 'DRIV:dev:dual-outlet-1',
    [Base.ATTR_CAPS]: ['base', 'swit', 'devconn'],
    [Base.ATTR_INSTANCES]: { outlet1: ['swit'], outlet2: ['swit'] },
    [Device.ATTR_DEVTYPEHINT]: 'Switch',
    [DeviceConnection.ATTR_STATE]: 'ONLINE',
    [`${Switch.ATTR_STATE}:outlet1`]: Switch.STATE_OFF,
    [`${Switch.ATTR_STATE}:outlet2`]: Switch.STATE_OFF,
    ...overrides,
  };
}

/** A normal single-switch device */
function makeSingleSwitch(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return {
    id: 'DRIV:dev:single-switch-1',
    [Base.ATTR_ADDRESS]: 'DRIV:dev:single-switch-1',
    [Base.ATTR_CAPS]: ['base', 'swit', 'devconn'],
    [Device.ATTR_DEVTYPEHINT]: 'Switch',
    [DeviceConnection.ATTR_STATE]: 'ONLINE',
    [Switch.ATTR_STATE]: Switch.STATE_ON,
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
      [Base.ATTR_CAPS]: ['base', 'temp'],
      [Base.ATTR_INSTANCES]: { sensor1: ['temp'], sensor2: ['temp'] },
    };
    expect(getSwitchInstances(device)).toEqual([]);
  });

  it('only returns instances with swit capability (mixed)', () => {
    const device = {
      [Base.ATTR_CAPS]: ['base', 'swit', 'temp'],
      [Base.ATTR_INSTANCES]: { relay1: ['swit'], sensor1: ['temp'] },
      [`${Switch.ATTR_STATE}:relay1`]: Switch.STATE_ON,
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
    const device = makeDualRelay({ [`${Switch.ATTR_STATE}:relay1`]: Switch.STATE_ON, [`${Switch.ATTR_STATE}:relay2`]: Switch.STATE_OFF });
    const config = resolveDeviceConfig(device);
    expect(isDeviceOn(device, config)).toBe(true);
  });

  it('returns false if all instances are OFF', () => {
    const device = makeDualRelay({ [`${Switch.ATTR_STATE}:relay1`]: Switch.STATE_OFF, [`${Switch.ATTR_STATE}:relay2`]: Switch.STATE_OFF });
    const config = resolveDeviceConfig(device);
    expect(isDeviceOn(device, config)).toBe(false);
  });

  it('returns true if all instances are ON', () => {
    const device = makeDualRelay({ [`${Switch.ATTR_STATE}:relay1`]: Switch.STATE_ON, [`${Switch.ATTR_STATE}:relay2`]: Switch.STATE_ON });
    const config = resolveDeviceConfig(device);
    expect(isDeviceOn(device, config)).toBe(true);
  });

  it('still works for single-switch devices', () => {
    const onDevice = makeSingleSwitch({ [Switch.ATTR_STATE]: Switch.STATE_ON });
    const offDevice = makeSingleSwitch({ [Switch.ATTR_STATE]: Switch.STATE_OFF });
    expect(isDeviceOn(onDevice, resolveDeviceConfig(onDevice))).toBe(true);
    expect(isDeviceOn(offDevice, resolveDeviceConfig(offDevice))).toBe(false);
  });
});

// ── getDeviceStatusText (multi-switch) ────────────────────────────────

describe('getDeviceStatusText – multi-switch', () => {
  it('shows per-instance status for dual relay', () => {
    const device = makeDualRelay({ [`${Switch.ATTR_STATE}:relay1`]: Switch.STATE_ON, [`${Switch.ATTR_STATE}:relay2`]: Switch.STATE_OFF });
    const config = resolveDeviceConfig(device);
    expect(getDeviceStatusText(device, config)).toBe('Relay 1 On, Relay 2 Off');
  });

  it('shows all on for dual relay', () => {
    const device = makeDualRelay({ [`${Switch.ATTR_STATE}:relay1`]: Switch.STATE_ON, [`${Switch.ATTR_STATE}:relay2`]: Switch.STATE_ON });
    const config = resolveDeviceConfig(device);
    expect(getDeviceStatusText(device, config)).toBe('Relay 1 On, Relay 2 On');
  });

  it('shows all off for dual outlet', () => {
    const device = makeDualOutlet();
    const config = resolveDeviceConfig(device);
    expect(getDeviceStatusText(device, config)).toBe('Outlet 1 Off, Outlet 2 Off');
  });

  it('still returns simple status for single-switch device', () => {
    const device = makeSingleSwitch({ [Switch.ATTR_STATE]: Switch.STATE_ON });
    const config = resolveDeviceConfig(device);
    expect(getDeviceStatusText(device, config)).toBe('On');
  });
});
