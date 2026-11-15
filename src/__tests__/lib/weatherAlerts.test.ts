import {
  WEATHER_ALERTS,
  formatWeatherAlertTime,
  getWeatherAlertDescription,
  placeStateCode,
  sortAlertsByDescription,
} from '@/lib/weatherAlerts';
import { Place } from '@arcus/core';
import type { PlaceData } from '@/store/entityTypes';

describe('weatherAlerts', () => {
  describe('WEATHER_ALERTS', () => {
    it('has unique EAS codes', () => {
      const codes = WEATHER_ALERTS.map((a) => a.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('marks the legacy popular alerts', () => {
      const popular = WEATHER_ALERTS.filter((a) => a.popular).map((a) => a.code).sort();
      expect(popular).toEqual(['EQW', 'FFW', 'HUW', 'HWW', 'SVR', 'TOR', 'TRW', 'WSW']);
    });
  });

  describe('getWeatherAlertDescription', () => {
    it('returns the readable name of a known code', () => {
      expect(getWeatherAlertDescription('TOR')).toBe('Tornado Warning');
    });

    it('capitalises an unknown code', () => {
      expect(getWeatherAlertDescription('XYZ')).toBe('Xyz');
    });

    it('falls back to a generic label when there is no code', () => {
      expect(getWeatherAlertDescription(undefined)).toBe('Weather Alert');
      expect(getWeatherAlertDescription('')).toBe('Weather Alert');
      expect(getWeatherAlertDescription('NONE')).toBe('Weather Alert');
    });
  });

  describe('sortAlertsByDescription', () => {
    it('sorts by description without changing the input', () => {
      const input = [
        { code: 'TOR', description: 'Tornado Warning', popular: true },
        { code: 'AVA', description: 'Avalanche Watch', popular: false },
      ];
      const sorted = sortAlertsByDescription(input);
      expect(sorted.map((a) => a.code)).toEqual(['AVA', 'TOR']);
      expect(input[0].code).toBe('TOR');
    });
  });

  describe('formatWeatherAlertTime', () => {
    it('formats a timestamp as "<date> at <time>"', () => {
      const ts = new Date(2018, 0, 22, 10, 2).getTime();
      expect(formatWeatherAlertTime(ts)).toBe('Jan 22, 2018 at 10:02 AM');
    });

    it('handles a missing timestamp', () => {
      expect(formatWeatherAlertTime(undefined)).toBe('Unknown time');
      expect(formatWeatherAlertTime(0)).toBe('Unknown time');
    });
  });

  describe('placeStateCode', () => {
    const place = (attrs: Partial<PlaceData>) => attrs as PlaceData;

    it('uses place:state', () => {
      expect(placeStateCode(place({ [Place.ATTR_STATE]: 'TX', [Place.ATTR_STATEPROV]: 'CA' }))).toBe('TX');
    });

    it('falls back to place:stateProv when place:state is missing or empty', () => {
      expect(placeStateCode(place({ [Place.ATTR_STATEPROV]: 'CA' }))).toBe('CA');
      expect(placeStateCode(place({ [Place.ATTR_STATE]: '', [Place.ATTR_STATEPROV]: 'CA' }))).toBe('CA');
    });

    it('is empty without either, or without a place', () => {
      expect(placeStateCode(place({}))).toBe('');
      expect(placeStateCode(null)).toBe('');
      expect(placeStateCode(undefined)).toBe('');
    });
  });
});
