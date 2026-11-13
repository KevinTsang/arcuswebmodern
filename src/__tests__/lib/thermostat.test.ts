import { Base, Device, DeviceAdvanced, HoneywellTCC, NestThermostat, Thermostat } from '@arcus/core';
import {
  applySetpointChange,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  getThermostatLimits,
  isAutoSupported,
  isEcoSupported,
  isHoneywellTcc,
  isNestLocked,
  isNestThermostat,
  isThermostatBlocked,
  setpointsForAuto,
  THERMOSTAT_MAX_F,
  THERMOSTAT_MIN_F,
  THERMOSTAT_MIN_SEPARATION_F,
} from '@/lib/thermostat';
import { makeDevice } from '../helpers/factories';

// ── Helpers ───────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:therm';
const c = fahrenheitToCelsius;
const DEFAULT_LIMITS = { minF: 45, maxF: 95, separationF: 3 };

// ── Tests ─────────────────────────────────────────────────────────────

describe('temperature conversion', () => {
  it('round-trips whole Fahrenheit degrees', () => {
    for (const f of [45, 68, 72, 95]) {
      expect(celsiusToFahrenheit(fahrenheitToCelsius(f))).toBe(f);
    }
  });
});

describe('getThermostatLimits', () => {
  it('falls back to 45–95 °F with a 3 °F separation', () => {
    expect(getThermostatLimits(makeDevice(ADDR))).toEqual({
      minF: THERMOSTAT_MIN_F,
      maxF: THERMOSTAT_MAX_F,
      separationF: THERMOSTAT_MIN_SEPARATION_F,
    });
  });

  it('uses the limits the device reports', () => {
    const device = makeDevice(ADDR, {
      [Thermostat.ATTR_MINSETPOINT]: c(50),
      [Thermostat.ATTR_MAXSETPOINT]: c(90),
      [Thermostat.ATTR_SETPOINTSEPARATION]: 5 * 5 / 9,
    });
    expect(getThermostatLimits(device)).toEqual({ minF: 50, maxF: 90, separationF: 5 });
  });

  it('ignores a zero separation', () => {
    const device = makeDevice(ADDR, { [Thermostat.ATTR_SETPOINTSEPARATION]: 0 });
    expect(getThermostatLimits(device).separationF).toBe(3);
  });

  it('narrows the range to the Nest temperature lock', () => {
    const device = makeDevice(ADDR, {
      [NestThermostat.ATTR_LOCKED]: true,
      [NestThermostat.ATTR_LOCKEDTEMPMIN]: c(62),
      [NestThermostat.ATTR_LOCKEDTEMPMAX]: c(80),
    });
    expect(getThermostatLimits(device)).toMatchObject({ minF: 62, maxF: 80 });
  });

  it('ignores an unlocked Nest lock range', () => {
    const device = makeDevice(ADDR, {
      [NestThermostat.ATTR_LOCKED]: false,
      [NestThermostat.ATTR_LOCKEDTEMPMIN]: c(62),
      [NestThermostat.ATTR_LOCKEDTEMPMAX]: c(80),
    });
    expect(getThermostatLimits(device)).toMatchObject({ minF: 45, maxF: 95 });
  });
});

describe('applySetpointChange', () => {
  it('steps a heat setpoint in HEAT mode', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_HEAT, { heatF: 70, coolF: 75 }, 'heat', 1, DEFAULT_LIMITS))
      .toEqual({ heatF: 71, coolF: 75 });
  });

  it('ignores separation outside AUTO', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_HEAT, { heatF: 74, coolF: 75 }, 'heat', 1, DEFAULT_LIMITS))
      .toEqual({ heatF: 75, coolF: 75 });
  });

  it('blocks raising past the maximum', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_COOL, { heatF: 70, coolF: 95 }, 'cool', 1, DEFAULT_LIMITS)).toBeNull();
  });

  it('blocks lowering past the minimum', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_HEAT, { heatF: 45, coolF: 75 }, 'heat', -1, DEFAULT_LIMITS)).toBeNull();
  });

  it('pulls an out-of-range setpoint back inside the range', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_HEAT, { heatF: 40, coolF: 75 }, 'heat', 1, DEFAULT_LIMITS))
      .toEqual({ heatF: 45, coolF: 75 });
  });

  it('pushes cool up when heat enters the AUTO separation gap', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_AUTO, { heatF: 70, coolF: 73 }, 'heat', 1, DEFAULT_LIMITS))
      .toEqual({ heatF: 71, coolF: 74 });
  });

  it('pushes heat down when cool enters the AUTO separation gap', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_AUTO, { heatF: 70, coolF: 73 }, 'cool', -1, DEFAULT_LIMITS))
      .toEqual({ heatF: 69, coolF: 72 });
  });

  it('blocks heat in AUTO when cool cannot move further up', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_AUTO, { heatF: 92, coolF: 95 }, 'heat', 1, DEFAULT_LIMITS)).toBeNull();
  });

  it('blocks cool in AUTO when heat cannot move further down', () => {
    expect(applySetpointChange(Thermostat.HVACMODE_AUTO, { heatF: 45, coolF: 48 }, 'cool', -1, DEFAULT_LIMITS)).toBeNull();
  });
});

describe('setpointsForAuto', () => {
  it('keeps setpoints that are far enough apart', () => {
    expect(setpointsForAuto(68, 75, DEFAULT_LIMITS)).toBeNull();
  });

  it('resets setpoints that are too close', () => {
    expect(setpointsForAuto(72, 73, DEFAULT_LIMITS)).toEqual({ heatF: 68, coolF: 78 });
  });

  it('resets when a setpoint is missing', () => {
    expect(setpointsForAuto(undefined, 75, DEFAULT_LIMITS)).toEqual({ heatF: 68, coolF: 78 });
  });
});

describe('mode support', () => {
  it('allows AUTO for old drivers reporting neither attribute', () => {
    expect(isAutoSupported(makeDevice(ADDR))).toBe(true);
  });

  it('honours therm:supportsAuto', () => {
    expect(isAutoSupported(makeDevice(ADDR, { [Thermostat.ATTR_SUPPORTSAUTO]: false }))).toBe(false);
    expect(isAutoSupported(makeDevice(ADDR, { [Thermostat.ATTR_SUPPORTSAUTO]: true }))).toBe(true);
  });

  it('reads AUTO and ECO from therm:supportedmodes', () => {
    const device = makeDevice(ADDR, {
      [Thermostat.ATTR_SUPPORTEDMODES]: [Thermostat.HVACMODE_HEAT, Thermostat.HVACMODE_ECO],
    });
    expect(isAutoSupported(device)).toBe(false);
    expect(isEcoSupported(device)).toBe(true);
    expect(isEcoSupported(makeDevice(ADDR))).toBe(false);
  });
});

describe('integration detection', () => {
  it('detects Nest by type hint or capability', () => {
    expect(isNestThermostat(makeDevice(ADDR, { [Device.ATTR_DEVTYPEHINT]: 'Nest Thermostat' }))).toBe(true);
    expect(isNestThermostat(makeDevice(ADDR, { [Base.ATTR_CAPS]: [NestThermostat.NAMESPACE] }))).toBe(true);
    expect(isNestThermostat(makeDevice(ADDR, { [Device.ATTR_DEVTYPEHINT]: 'Thermostat' }))).toBe(false);
  });

  it('detects Honeywell TCC by capability or type hint', () => {
    expect(isHoneywellTcc(makeDevice(ADDR, { [Base.ATTR_CAPS]: [HoneywellTCC.NAMESPACE] }))).toBe(true);
    expect(isHoneywellTcc(makeDevice(ADDR, { [Device.ATTR_DEVTYPEHINT]: 'TCCThermostat' }))).toBe(true);
    expect(isHoneywellTcc(makeDevice(ADDR))).toBe(false);
  });

  it('requires both lock bounds for a Nest lock', () => {
    expect(isNestLocked(makeDevice(ADDR, { [NestThermostat.ATTR_LOCKED]: true }))).toBe(false);
  });

  it('blocks a rate-limited Nest thermostat only', () => {
    const errors = { [DeviceAdvanced.ATTR_ERRORS]: { ERR_RATELIMIT: 'Rate limited' } };
    expect(isThermostatBlocked(makeDevice(ADDR, { [Device.ATTR_DEVTYPEHINT]: 'Nest Thermostat', ...errors }))).toBe(true);
    expect(isThermostatBlocked(makeDevice(ADDR, { [Device.ATTR_DEVTYPEHINT]: 'Thermostat', ...errors }))).toBe(false);
    expect(isThermostatBlocked(makeDevice(ADDR, { [Device.ATTR_DEVTYPEHINT]: 'Nest Thermostat' }))).toBe(false);
  });
});
