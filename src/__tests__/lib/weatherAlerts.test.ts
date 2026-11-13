import {
  WEATHER_ALERTS,
  NO_WEATHER_ALERT,
  formatWeatherAlertTime,
  getWeatherAlertDescription,
  sortAlertsByDescription,
} from '@/lib/weatherAlerts';

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
      expect(getWeatherAlertDescription(NO_WEATHER_ALERT)).toBe('Weather Alert');
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
});
