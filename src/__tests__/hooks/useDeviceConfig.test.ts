import {
  cToF,
  formatTemp,
  isDeviceOn,
  isDeviceOpen,
  isDeviceOffline,
  isDeviceAway,
  getDeviceStatusText,
  resolveDeviceIcon,
} from '@/hooks/useDeviceConfig';
import type { DeviceWebConfig } from '@/lib/deviceConfig';

const BASE_CONFIG: DeviceWebConfig = {
  'web:icon:on': 'icon-on',
  'web:icon:off': 'icon-off',
  'web:icon:catalog': 'icon-catalog',
  'web:icon:onAndOpen': null,
  'web:icon:onAndClosed': null,
  'web:icon:offAndOpen': null,
  'web:icon:offAndClosed': null,
  'web:icon:onText': null,
  'web:panel:status': '',
  'web:panel:statusComponent': '',
  'web:panel:action': null,
  'web:card:action': null,
  'web:card:hoveraction': null,
  'web:card:status': '',
  'web:card:statusComponent': '',
  'web:card:hoverstatus': null,
  'web:isOnUnlessOffline': false,
  'web:scene:groupString': null,
  'web:switch:auxLabel': null,
  'web:therm:autoDescription': '',
  'web:devpow:batterycapable': false,
  'web:dev:hasDetails': false,
  'web:dev:customErrorComponent': null,
  'web:dev:hasCustomErrorLink': false,
  'web:dev:supported': true,
  'web:dev:supportLinkKey': '',
  'web:dev:scheduleConfig': null,
};

describe('cToF', () => {
  it('converts 0°C to 32°F', () => {
    expect(cToF(0)).toBe(32);
  });

  it('converts 100°C to 212°F', () => {
    expect(cToF(100)).toBe(212);
  });

  it('converts 22°C to 72°F', () => {
    expect(cToF(22)).toBe(72);
  });

  it('rounds the result', () => {
    expect(cToF(22.5)).toBe(73);
  });
});

describe('formatTemp', () => {
  it('formats null as --', () => {
    expect(formatTemp(null)).toBe('--');
    expect(formatTemp(undefined)).toBe('--');
  });

  it('converts Celsius to Fahrenheit string', () => {
    expect(formatTemp(22)).toBe('72');
  });
});

describe('isDeviceOffline', () => {
  it('returns true when connState is OFFLINE', () => {
    expect(isDeviceOffline({ 'devconn:state': 'OFFLINE' })).toBe(true);
  });

  it('returns false when connState is ONLINE', () => {
    expect(isDeviceOffline({ 'devconn:state': 'ONLINE' })).toBe(false);
  });

  it('returns false when connState is undefined', () => {
    expect(isDeviceOffline({})).toBe(false);
  });
});

describe('isDeviceAway', () => {
  it('returns true when presence is ABSENT', () => {
    expect(isDeviceAway({ 'pres:presence': 'ABSENT' })).toBe(true);
  });

  it('returns false when presence is PRESENT', () => {
    expect(isDeviceAway({ 'pres:presence': 'PRESENT' })).toBe(false);
  });
});

describe('isDeviceOn', () => {
  it('checks swit:state for switches', () => {
    expect(isDeviceOn({ 'swit:state': 'ON' }, BASE_CONFIG)).toBe(true);
    expect(isDeviceOn({ 'swit:state': 'OFF' }, BASE_CONFIG)).toBe(false);
  });

  it('checks cont:contact for contact sensors', () => {
    expect(isDeviceOn({ 'cont:contact': 'OPENED' }, BASE_CONFIG)).toBe(true);
    expect(isDeviceOn({ 'cont:contact': 'CLOSED' }, BASE_CONFIG)).toBe(false);
  });

  it('checks pres:presence for presence sensors', () => {
    expect(isDeviceOn({ 'pres:presence': 'PRESENT' }, BASE_CONFIG)).toBe(true);
    expect(isDeviceOn({ 'pres:presence': 'ABSENT' }, BASE_CONFIG)).toBe(false);
  });

  it('uses isOnUnlessOffline when configured', () => {
    const config = { ...BASE_CONFIG, 'web:isOnUnlessOffline': true };
    expect(isDeviceOn({ 'devconn:state': 'ONLINE' }, config)).toBe(true);
    expect(isDeviceOn({ 'devconn:state': 'OFFLINE' }, config)).toBe(false);
  });
});

describe('isDeviceOpen', () => {
  it('checks contact sensor', () => {
    expect(isDeviceOpen({ 'cont:contact': 'OPENED' })).toBe(true);
    expect(isDeviceOpen({ 'cont:contact': 'CLOSED' })).toBe(false);
  });

  it('checks tilt sensor', () => {
    expect(isDeviceOpen({ 'tilt:tiltstate': 'FLAT' })).toBe(true);
    expect(isDeviceOpen({ 'tilt:tiltstate': 'UPRIGHT' })).toBe(false);
  });

  it('checks door lock', () => {
    expect(isDeviceOpen({ 'doorlock:lockstate': 'UNLOCKED' })).toBe(true);
    expect(isDeviceOpen({ 'doorlock:lockstate': 'LOCKED' })).toBe(false);
  });

  it('checks motorized door', () => {
    expect(isDeviceOpen({ 'motdoor:doorstate': 'OPEN' })).toBe(true);
    expect(isDeviceOpen({ 'motdoor:doorstate': 'CLOSED' })).toBe(false);
  });

  it('checks valve', () => {
    expect(isDeviceOpen({ 'valv:valvestate': 'OPEN' })).toBe(true);
    expect(isDeviceOpen({ 'valv:valvestate': 'CLOSED' })).toBe(false);
  });

  it('returns false for unknown device', () => {
    expect(isDeviceOpen({})).toBe(false);
  });
});

describe('getDeviceStatusText', () => {
  it('returns On/Off for switch', () => {
    expect(getDeviceStatusText({ 'dev:devtypehint': 'Switch', 'swit:state': 'ON' }, BASE_CONFIG)).toBe('On');
    expect(getDeviceStatusText({ 'dev:devtypehint': 'Switch', 'swit:state': 'OFF' }, BASE_CONFIG)).toBe('Off');
  });

  it('returns brightness for dimmer', () => {
    expect(
      getDeviceStatusText({ 'dev:devtypehint': 'Dimmer', 'swit:state': 'ON', 'dim:brightness': 75 }, BASE_CONFIG),
    ).toBe('75% Brightness');
  });

  it('returns Open/Closed for contact', () => {
    expect(getDeviceStatusText({ 'dev:devtypehint': 'Contact', 'cont:contact': 'OPENED' }, BASE_CONFIG)).toBe('Open');
    expect(getDeviceStatusText({ 'dev:devtypehint': 'Contact', 'cont:contact': 'CLOSED' }, BASE_CONFIG)).toBe('Closed');
  });

  it('returns Locked/Unlocked for lock', () => {
    expect(
      getDeviceStatusText({ 'dev:devtypehint': 'Lock', 'doorlock:lockstate': 'LOCKED' }, BASE_CONFIG),
    ).toBe('Locked');
    expect(
      getDeviceStatusText({ 'dev:devtypehint': 'Lock', 'doorlock:lockstate': 'UNLOCKED' }, BASE_CONFIG),
    ).toBe('Unlocked');
  });

  it('returns thermostat mode and setpoint', () => {
    expect(
      getDeviceStatusText(
        { 'dev:devtypehint': 'Thermostat', 'therm:hvacmode': 'HEAT', 'therm:heatsetpoint': 22 },
        BASE_CONFIG,
      ),
    ).toBe('Heat to 72\u00B0');
  });

  it('returns Off for thermostat in OFF mode', () => {
    expect(
      getDeviceStatusText({ 'dev:devtypehint': 'Thermostat', 'therm:hvacmode': 'OFF' }, BASE_CONFIG),
    ).toBe('Off');
  });

  it('returns Ok for motion sensor', () => {
    expect(getDeviceStatusText({ 'dev:devtypehint': 'Motion' }, BASE_CONFIG)).toBe('Ok');
  });
});

describe('resolveDeviceIcon', () => {
  it('uses on icon when device is on', () => {
    const result = resolveDeviceIcon({ 'swit:state': 'ON' }, BASE_CONFIG);
    expect(result.iconClass).toBe('icon-on');
    expect(result.stateClass).toContain('is-on');
  });

  it('uses off icon when device is off', () => {
    const result = resolveDeviceIcon({ 'swit:state': 'OFF' }, BASE_CONFIG);
    expect(result.iconClass).toBe('icon-off');
    expect(result.stateClass).not.toContain('is-on');
  });

  it('adds is-offline class when offline', () => {
    const result = resolveDeviceIcon({ 'devconn:state': 'OFFLINE' }, BASE_CONFIG);
    expect(result.stateClass).toContain('is-offline');
  });

  it('uses onAndOpen icon when available', () => {
    const config = { ...BASE_CONFIG, 'web:icon:onAndOpen': 'icon-on-open' };
    const result = resolveDeviceIcon({ 'swit:state': 'ON', 'cont:contact': 'OPENED' }, config);
    expect(result.iconClass).toBe('icon-on-open');
  });

  it('shows text for temperature icon', () => {
    const config = { ...BASE_CONFIG, 'web:icon:onText': 'temperature' };
    const result = resolveDeviceIcon({ 'swit:state': 'ON', 'temp:temperature': 22 }, config);
    expect(result.showText).toBe(true);
    expect(result.textContent).toBe('72');
  });

  it('detects radial for dimmers', () => {
    const result = resolveDeviceIcon({ 'swit:state': 'ON', 'dim:brightness': 50 }, BASE_CONFIG);
    expect(result.hasRadial).toBe(true);
    expect(result.brightness).toBe(50);
  });
});
