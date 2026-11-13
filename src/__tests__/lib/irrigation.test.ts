import { Base, IrrigationController, IrrigationZone } from '@arcus/core';
import {
  defaultZoneName,
  describeEventZones,
  formatTimeOfDay,
  formatWateringDuration,
  getIrrigationZones,
  sortEventsByTime,
  sortWeekDays,
  toTimeInputValue,
  zoneAttr,
} from '@/lib/irrigation';
import { makeDevice } from '../helpers/factories';
import { makeEvent, makeZone } from '../helpers/irrigation';

// ── Tests ─────────────────────────────────────────────────────────────

describe('irrigation helpers', () => {
  describe('getIrrigationZones', () => {
    it('returns an empty list without a device', () => {
      expect(getIrrigationZones(undefined)).toEqual([]);
    });

    it('derives zones from irrcont:numZones when there are no zone instances', () => {
      const device = makeDevice('DRIV:dev:c', {
        [IrrigationController.ATTR_NUMZONES]: 2,
        [zoneAttr(IrrigationZone.ATTR_ZONENAME, 'z1')]: 'Front',
        [zoneAttr(IrrigationZone.ATTR_ZONESTATE, 'z2')]: IrrigationZone.ZONESTATE_WATERING,
        [zoneAttr(IrrigationZone.ATTR_WATERINGDURATION, 'z2')]: 15,
        [zoneAttr(IrrigationZone.ATTR_DEFAULTDURATION, 'z2')]: 20,
      });

      expect(getIrrigationZones(device)).toEqual([
        { zone: 'z1', zoneNum: 1, name: 'Front', watering: false, defaultDuration: 1, wateringDuration: 0 },
        { zone: 'z2', zoneNum: 2, name: 'Zone 2', watering: true, defaultDuration: 20, wateringDuration: 15 },
      ]);
    });

    it('prefers irr zone instances and sorts them by zone number', () => {
      const device = makeDevice('DRIV:dev:c', {
        [IrrigationController.ATTR_NUMZONES]: 12,
        [Base.ATTR_INSTANCES]: { z10: ['irr'], z2: ['irr'], other: ['swit'] },
        [zoneAttr(IrrigationZone.ATTR_ZONENUM, 'z10')]: 10,
        [zoneAttr(IrrigationZone.ATTR_ZONENUM, 'z2')]: 2,
      });

      expect(getIrrigationZones(device).map((z) => z.zone)).toEqual(['z2', 'z10']);
    });

    it('falls back to the default name when the zone name is empty', () => {
      const device = makeDevice('DRIV:dev:c', {
        [IrrigationController.ATTR_NUMZONES]: 1,
        [zoneAttr(IrrigationZone.ATTR_ZONENAME, 'z1')]: '',
      });
      expect(getIrrigationZones(device)[0].name).toBe('Zone 1');
    });

    it('returns no zones when the controller reports none', () => {
      expect(getIrrigationZones(makeDevice('DRIV:dev:c'))).toEqual([]);
    });
  });

  describe('formatting', () => {
    it('names zones by number', () => {
      expect(defaultZoneName('z7')).toBe('Zone 7');
    });

    it.each([
      [5, '5 min'],
      [45, '45 min'],
      [60, '1 hr'],
      [180, '3 hrs'],
    ])('formats %i minutes as %s', (minutes, text) => {
      expect(formatWateringDuration(minutes)).toBe(text);
    });

    it.each([
      ['06:30:00', '6:30 AM'],
      ['00:05', '12:05 AM'],
      ['12:00:00', '12:00 PM'],
      ['18:45:00', '6:45 PM'],
      ['bad', 'bad'],
    ])('formats time %s as %s', (time, text) => {
      expect(formatTimeOfDay(time)).toBe(text);
    });

    it('converts a time of day to an input value', () => {
      expect(toTimeInputValue('6:30:00')).toBe('06:30');
      expect(toTimeInputValue('')).toBe('');
    });
  });

  describe('sorting', () => {
    it('sorts weekdays Monday first', () => {
      expect(sortWeekDays(['SUN', 'WED', 'MON'])).toEqual(['MON', 'WED', 'SUN']);
    });

    it('sorts events by start time', () => {
      const events = [makeEvent('b', { timeOfDay: '18:00:00' }), makeEvent('a', { timeOfDay: '6:00:00' })];
      expect(sortEventsByTime(events).map((e) => e.eventId)).toEqual(['a', 'b']);
    });
  });

  describe('describeEventZones', () => {
    const zones = [makeZone(1, { name: 'Front' }), makeZone(2, { name: 'Back' }), makeZone(3), makeZone(4)];

    it('lists up to two zone names', () => {
      const event = makeEvent('e', { events: [{ zone: 'z1', duration: 5 }, { zone: 'z2', duration: 5 }] });
      expect(describeEventZones(event, zones)).toBe('Front, Back');
    });

    it('summarises more than two zones', () => {
      const event = makeEvent('e', {
        events: ['z1', 'z2', 'z3', 'z4'].map((zone) => ({ zone, duration: 5 })),
      });
      expect(describeEventZones(event, zones)).toBe('Front, Back & 2 more');
    });

    it('falls back to a default name for unknown zones and handles no events', () => {
      expect(describeEventZones(makeEvent('e', { events: [{ zone: 'z9', duration: 5 }] }), zones)).toBe('Zone 9');
      expect(describeEventZones(makeEvent('e', { events: undefined }), zones)).toBe('');
    });
  });
});
