import { Thermostat } from '@arcus/core';
import {
  celsiusToFahrenheit,
  defaultScheduleAttributes,
  describeThermostatCommand,
  fahrenheitToCelsius,
  initialScheduleMode,
  setpointF,
  setpointLimits,
  thermostatScheduleModes,
} from '@/lib/thermostatSchedule';

describe('thermostatSchedule', () => {
  describe('temperature conversion', () => {
    it('converts between Celsius and whole Fahrenheit degrees', () => {
      expect(celsiusToFahrenheit(20)).toBe(68);
      expect(celsiusToFahrenheit(fahrenheitToCelsius(73))).toBe(73);
      expect(fahrenheitToCelsius(32)).toBe(0);
    });
  });

  describe('thermostatScheduleModes', () => {
    it('offers Heat, Cool and Auto by default', () => {
      expect(thermostatScheduleModes(undefined)).toEqual([
        Thermostat.HVACMODE_HEAT, Thermostat.HVACMODE_COOL, Thermostat.HVACMODE_AUTO,
      ]);
    });

    it('limits modes to the supported ones', () => {
      expect(thermostatScheduleModes({
        [Thermostat.ATTR_SUPPORTEDMODES]: [Thermostat.HVACMODE_OFF, Thermostat.HVACMODE_HEAT],
      })).toEqual([Thermostat.HVACMODE_HEAT]);
    });

    it('drops Auto when the thermostat does not support it', () => {
      expect(thermostatScheduleModes({ [Thermostat.ATTR_SUPPORTSAUTO]: false }))
        .toEqual([Thermostat.HVACMODE_HEAT, Thermostat.HVACMODE_COOL]);
    });

    it('treats an empty supported-modes list as unknown', () => {
      expect(thermostatScheduleModes({ [Thermostat.ATTR_SUPPORTEDMODES]: [] })).toHaveLength(3);
    });
  });

  describe('initialScheduleMode', () => {
    const modes = [Thermostat.HVACMODE_HEAT, Thermostat.HVACMODE_COOL];

    it('starts on the current HVAC mode', () => {
      expect(initialScheduleMode({ [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_COOL }, modes))
        .toBe(Thermostat.HVACMODE_COOL);
    });

    it('falls back to the first mode when the thermostat is off', () => {
      expect(initialScheduleMode({ [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_OFF }, modes))
        .toBe(Thermostat.HVACMODE_HEAT);
    });

    it('falls back to Heat when there are no modes', () => {
      expect(initialScheduleMode(undefined, [])).toBe(Thermostat.HVACMODE_HEAT);
    });
  });

  describe('setpointLimits', () => {
    it('uses 45–95 °F with 3 °F separation by default', () => {
      expect(setpointLimits(undefined)).toEqual({ minF: 45, maxF: 95, separationF: 3 });
    });

    it('reads the device limits', () => {
      expect(setpointLimits({
        [Thermostat.ATTR_MINSETPOINT]: 10,
        [Thermostat.ATTR_MAXSETPOINT]: 30,
        [Thermostat.ATTR_SETPOINTSEPARATION]: 2.5,
      })).toEqual({ minF: 50, maxF: 86, separationF: 5 });
    });
  });

  describe('defaultScheduleAttributes', () => {
    it('starts from the current setpoints', () => {
      expect(defaultScheduleAttributes({
        [Thermostat.ATTR_HEATSETPOINT]: 19,
        [Thermostat.ATTR_COOLSETPOINT]: 26,
      })).toEqual({ [Thermostat.ATTR_HEATSETPOINT]: 19, [Thermostat.ATTR_COOLSETPOINT]: 26 });
    });

    it('falls back to 68 °F / 78 °F', () => {
      const attrs = defaultScheduleAttributes(undefined);
      expect(setpointF(attrs, Thermostat.ATTR_HEATSETPOINT, 0)).toBe(68);
      expect(setpointF(attrs, Thermostat.ATTR_COOLSETPOINT, 0)).toBe(78);
    });
  });

  describe('setpointF', () => {
    it('falls back when the attribute is missing or not a number', () => {
      expect(setpointF({}, Thermostat.ATTR_HEATSETPOINT, 70)).toBe(70);
      expect(setpointF({ [Thermostat.ATTR_HEATSETPOINT]: 'x' }, Thermostat.ATTR_HEATSETPOINT, 70)).toBe(70);
    });
  });

  describe('describeThermostatCommand', () => {
    const attributes = { [Thermostat.ATTR_HEATSETPOINT]: 20, [Thermostat.ATTR_COOLSETPOINT]: 25 };

    it('describes each mode', () => {
      expect(describeThermostatCommand({ scheduleId: Thermostat.HVACMODE_HEAT, attributes })).toBe('Heat 68°');
      expect(describeThermostatCommand({ scheduleId: Thermostat.HVACMODE_COOL, attributes })).toBe('Cool 77°');
      expect(describeThermostatCommand({ scheduleId: Thermostat.HVACMODE_AUTO, attributes })).toBe('68°–77°');
    });

    it('uses default setpoints when attributes are missing', () => {
      expect(describeThermostatCommand({ scheduleId: Thermostat.HVACMODE_HEAT })).toBe('Heat 68°');
    });

    it('returns an empty string for an unknown schedule', () => {
      expect(describeThermostatCommand({ scheduleId: 'FIRE', attributes })).toBe('');
    });
  });
});
