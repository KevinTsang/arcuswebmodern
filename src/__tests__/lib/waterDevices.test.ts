import {
  AOSmithWaterHeaterController, Base, Device, EcowaterWaterSoftener, Flow, WaterHardness,
  WaterHeater, WaterSoftener,
} from '@arcus/core';
import {
  WATER_HEATER_CEILING_F,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatHour,
  formatRechargeTimeRemaining,
  getFlowRateKey,
  getHotWaterLevelLabel,
  getSaltLevelPercent,
  getWaterHeaterMaxF,
  getWaterHeaterModeLabel,
  getWaterHeaterStatus,
  getWaterSoftenerStatus,
  stepWaterHeaterSetpoint,
} from '@/lib/waterDevices';
import { resolveDeviceBadgeData, getDeviceStatusText } from '@/hooks/useDeviceConfig';
import { resolveDeviceConfig, resolveDeviceConfigurators } from '@/lib/deviceConfig';
import { makeDevice } from '../helpers/factories';

// ── Helpers ───────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:water';

function softener(overrides: Record<string, unknown> = {}) {
  return makeDevice(ADDR, {
    [Base.ATTR_CAPS]: ['base', 'dev', 'watersoftener', 'waterhardness', 'ecowater', 'flow'],
    [Device.ATTR_DEVTYPEHINT]: 'WaterSoftener',
    [WaterSoftener.ATTR_CURRENTSALTLEVEL]: 3,
    [WaterSoftener.ATTR_MAXSALTLEVEL]: 12,
    [WaterSoftener.ATTR_RECHARGESTATUS]: WaterSoftener.RECHARGESTATUS_READY,
    [WaterSoftener.ATTR_RECHARGESTARTTIME]: 2,
    [WaterHardness.ATTR_HARDNESS]: 15,
    [EcowaterWaterSoftener.ATTR_CONTINUOUSRATE]: 2,
    [Flow.ATTR_FLOW]: 1.25,
    ...overrides,
  });
}

function heater(overrides: Record<string, unknown> = {}) {
  return makeDevice(ADDR, {
    [Base.ATTR_CAPS]: ['base', 'dev', 'waterheater', 'aosmithwaterheatercontroller'],
    [Device.ATTR_DEVTYPEHINT]: 'WaterHeater',
    [WaterHeater.ATTR_SETPOINT]: 50,
    [WaterHeater.ATTR_MAXSETPOINT]: 60,
    [WaterHeater.ATTR_HEATINGSTATE]: false,
    [WaterHeater.ATTR_HOTWATERLEVEL]: WaterHeater.HOTWATERLEVEL_HIGH,
    [AOSmithWaterHeaterController.ATTR_CONTROLMODE]: AOSmithWaterHeaterController.CONTROLMODE_STANDARD,
    ...overrides,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('temperature conversion', () => {
  it('round-trips Celsius and Fahrenheit', () => {
    expect(celsiusToFahrenheit(50)).toBe(122);
    expect(celsiusToFahrenheit(fahrenheitToCelsius(130))).toBe(130);
  });
});

describe('getWaterHeaterMaxF', () => {
  it('uses the device max setpoint in Fahrenheit', () => {
    expect(getWaterHeaterMaxF(heater())).toBe(140);
  });

  it('caps the max at 65°C', () => {
    expect(getWaterHeaterMaxF(heater({ [WaterHeater.ATTR_MAXSETPOINT]: 80 }))).toBe(WATER_HEATER_CEILING_F);
    expect(WATER_HEATER_CEILING_F).toBe(149);
  });

  it('falls back to the ceiling when the device reports no max', () => {
    expect(getWaterHeaterMaxF(undefined)).toBe(149);
    expect(getWaterHeaterMaxF(heater({ [WaterHeater.ATTR_MAXSETPOINT]: undefined }))).toBe(149);
  });

  it('never goes below the 60° floor', () => {
    expect(getWaterHeaterMaxF(heater({ [WaterHeater.ATTR_MAXSETPOINT]: 5 }))).toBe(60);
  });
});

describe('stepWaterHeaterSetpoint', () => {
  it('jumps from 60 to 80 and back', () => {
    expect(stepWaterHeaterSetpoint(60, 1, 140)).toBe(80);
    expect(stepWaterHeaterSetpoint(80, -1, 140)).toBe(60);
  });

  it('steps by one degree within range', () => {
    expect(stepWaterHeaterSetpoint(120, 1, 140)).toBe(121);
    expect(stepWaterHeaterSetpoint(120, -1, 140)).toBe(119);
  });

  it('clamps at the bounds', () => {
    expect(stepWaterHeaterSetpoint(140, 1, 140)).toBe(140);
    expect(stepWaterHeaterSetpoint(60, -1, 140)).toBe(60);
    expect(stepWaterHeaterSetpoint(150, -1, 140)).toBe(140);
  });

  it('snaps a setpoint inside the skipped range', () => {
    expect(stepWaterHeaterSetpoint(70, 1, 140)).toBe(80);
    expect(stepWaterHeaterSetpoint(70, -1, 140)).toBe(60);
  });
});

describe('labels', () => {
  it('labels AO Smith control modes', () => {
    expect(getWaterHeaterModeLabel(AOSmithWaterHeaterController.CONTROLMODE_ENERGY_SMART)).toBe('EnergySmart®');
    expect(getWaterHeaterModeLabel(AOSmithWaterHeaterController.CONTROLMODE_VACATION)).toBe('Vacation');
    expect(getWaterHeaterModeLabel(AOSmithWaterHeaterController.CONTROLMODE_STANDARD)).toBeNull();
    expect(getWaterHeaterModeLabel(undefined)).toBeNull();
  });

  it('labels hot water levels', () => {
    expect(getHotWaterLevelLabel(WaterHeater.HOTWATERLEVEL_HIGH)).toBe('High');
    expect(getHotWaterLevelLabel(WaterHeater.HOTWATERLEVEL_MEDIUM)).toBe('Medium');
    expect(getHotWaterLevelLabel(WaterHeater.HOTWATERLEVEL_LOW)).toBe('Low');
    expect(getHotWaterLevelLabel(undefined)).toBe('--');
  });
});

describe('getSaltLevelPercent', () => {
  it('returns the salt level as a percentage of capacity', () => {
    expect(getSaltLevelPercent(softener())).toBe(25);
  });

  it('returns null when either level is missing or max is zero', () => {
    expect(getSaltLevelPercent(undefined)).toBeNull();
    expect(getSaltLevelPercent(softener({ [WaterSoftener.ATTR_MAXSALTLEVEL]: undefined }))).toBeNull();
    expect(getSaltLevelPercent(softener({ [WaterSoftener.ATTR_MAXSALTLEVEL]: 0 }))).toBeNull();
  });

  it('clamps to 0–100', () => {
    expect(getSaltLevelPercent(softener({ [WaterSoftener.ATTR_CURRENTSALTLEVEL]: 20 }))).toBe(100);
  });
});

describe('time formatting', () => {
  it('formats recharge time remaining as h:mm', () => {
    expect(formatRechargeTimeRemaining(125)).toBe('2:05');
    expect(formatRechargeTimeRemaining(0)).toBe('0:00');
    expect(formatRechargeTimeRemaining(undefined)).toBe('0:00');
  });

  it('formats hours of the day', () => {
    expect(formatHour(0)).toBe('12:00 AM');
    expect(formatHour(2)).toBe('2:00 AM');
    expect(formatHour(12)).toBe('12:00 PM');
    expect(formatHour(23)).toBe('11:00 PM');
  });
});

describe('status text', () => {
  it('describes a softener by recharge status', () => {
    expect(getWaterSoftenerStatus(softener())).toBe('Ready');
    expect(getWaterSoftenerStatus(softener({
      [WaterSoftener.ATTR_RECHARGESTATUS]: WaterSoftener.RECHARGESTATUS_RECHARGE_SCHEDULED,
    }))).toBe('Recharge Time: 2:00 AM');
    expect(getWaterSoftenerStatus(softener({
      [WaterSoftener.ATTR_RECHARGESTATUS]: WaterSoftener.RECHARGESTATUS_RECHARGE_SCHEDULED,
      [WaterSoftener.ATTR_RECHARGESTARTTIME]: undefined,
    }))).toBe('Recharge Scheduled');
    expect(getWaterSoftenerStatus(softener({
      [WaterSoftener.ATTR_RECHARGESTATUS]: WaterSoftener.RECHARGESTATUS_RECHARGING,
      [WaterSoftener.ATTR_RECHARGETIMEREMAINING]: 45,
    }))).toBe('Recharging: 0:45 Left');
  });

  it('describes a heater by setpoint and heating state', () => {
    expect(getWaterHeaterStatus(heater())).toBe('Set to 122°');
    expect(getWaterHeaterStatus(heater({ [WaterHeater.ATTR_HEATINGSTATE]: true }))).toBe('Heating to 122°');
    expect(getWaterHeaterStatus(heater({ [WaterHeater.ATTR_SETPOINT]: undefined }))).toBe('Idle');
    expect(getWaterHeaterStatus(heater({
      [WaterHeater.ATTR_SETPOINT]: undefined, [WaterHeater.ATTR_HEATINGSTATE]: true,
    }))).toBe('Heating');
  });

  it('is used for the device row status', () => {
    expect(getDeviceStatusText(heater(), resolveDeviceConfig(heater()))).toBe('Set to 122°');
    expect(getDeviceStatusText(softener(), resolveDeviceConfig(softener()))).toBe('Ready');
  });
});

describe('getFlowRateKey', () => {
  it.each([
    [0, 'OFF'], [0.2, 'OFF'], [0.3, 'LOW'], [1.9, 'LOW'], [2, 'MEDIUM'], [8, 'HIGH'], [10, 'HIGH'],
  ])('maps %p GPM to %s', (rate, key) => {
    expect(getFlowRateKey(softener({ [EcowaterWaterSoftener.ATTR_CONTINUOUSRATE]: rate }))).toBe(key);
  });

  it('is OFF when continuous use alerts are disabled or no rate is reported', () => {
    expect(getFlowRateKey(softener({ [EcowaterWaterSoftener.ATTR_ALERTONCONTINUOUSUSE]: false }))).toBe('OFF');
    expect(getFlowRateKey(softener({ [EcowaterWaterSoftener.ATTR_CONTINUOUSRATE]: undefined }))).toBe('OFF');
    expect(getFlowRateKey(undefined)).toBe('OFF');
  });
});

describe('device config for water devices', () => {
  it('wires heater and softener panel actions', () => {
    expect(resolveDeviceConfig(heater())['web:panel:action']).toBe('changeWaterHeaterTemperature');
    expect(resolveDeviceConfig(softener())['web:panel:action']).toBe('recharge-now');
  });

  it('lists softener configurators', () => {
    expect(resolveDeviceConfigurators(softener())).toEqual(expect.arrayContaining([
      'water-softener-recharge-time', 'water-flow', 'water-hardness', 'water-salt-type',
    ]));
  });

  it('offers the mode picker only for AO Smith heaters', () => {
    expect(resolveDeviceConfigurators(heater())).toContain('water-heater-mode');
    const plain = heater({ [Base.ATTR_CAPS]: ['base', 'dev', 'waterheater'] });
    expect(resolveDeviceConfigurators(plain)).not.toContain('water-heater-mode');
  });

  it('shows salt percentage and flow badges for a softener', () => {
    const badges = resolveDeviceBadgeData(softener());
    expect(badges).toEqual(expect.arrayContaining([
      { key: 'salt-level', label: 'Salt', value: '25%' },
      { key: 'gpm', label: 'Flow', value: '1.3 GPM' },
    ]));
  });

  it('hides the salt badge when salt monitoring is disabled', () => {
    const badges = resolveDeviceBadgeData(softener({ [WaterSoftener.ATTR_SALTLEVELENABLED]: false }));
    expect(badges.find((b) => b.key === 'salt-level')).toBeUndefined();
  });

  it('shows heater badges and hides the mode badge in Standard mode', () => {
    const badges = resolveDeviceBadgeData(heater());
    expect(badges).toEqual(expect.arrayContaining([
      { key: 'heatingState', label: 'Heating', value: 'Off' },
      { key: 'hotWaterLevel', label: 'Hot Water', value: 'High' },
      { key: 'lowHeatTarget', label: 'Target', value: '122°' },
    ]));
    expect(badges.find((b) => b.key === 'waterHeaterEnergySmart')).toBeUndefined();
  });

  it('shows the EnergySmart mode badge', () => {
    const badges = resolveDeviceBadgeData(heater({
      [AOSmithWaterHeaterController.ATTR_CONTROLMODE]: AOSmithWaterHeaterController.CONTROLMODE_ENERGY_SMART,
    }));
    expect(badges).toContainEqual({ key: 'waterHeaterEnergySmart', label: 'Mode', value: 'EnergySmart®' });
  });
});
