import { Place } from '@arcus/core';
import {
  SELECTABLE_PLANS,
  SERVICE_ADDON_CELLBACKUP,
  addonName,
  isBasicLevel,
  isPremiumLevel,
  isPromonLevel,
  planName,
} from '@/components/settings/servicePlans';

describe('planName', () => {
  it.each([
    [Place.SERVICELEVEL_BASIC, 'Basic'],
    [Place.SERVICELEVEL_PREMIUM, 'Premium'],
    [Place.SERVICELEVEL_PREMIUM_FREE, 'Premium (Free)'],
    [Place.SERVICELEVEL_PREMIUM_ANNUAL, 'Premium Annual'],
    [Place.SERVICELEVEL_PREMIUM_PROMON, 'Professional Monitoring'],
    [Place.SERVICELEVEL_PREMIUM_PROMON_FREE, 'Professional Monitoring (Free)'],
    [Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL, 'Professional Monitoring Annual'],
  ])('names %s as %s', (level, name) => {
    expect(planName(level)).toBe(name);
  });

  it('falls back to the raw level for an unknown plan', () => {
    expect(planName('GOLD')).toBe('GOLD');
  });

  it('shows a dash with no level', () => {
    expect(planName(undefined)).toBe('—');
    expect(planName(null)).toBe('—');
    expect(planName('')).toBe('—');
  });
});

describe('addonName', () => {
  it('names cellular backup', () => {
    expect(addonName(SERVICE_ADDON_CELLBACKUP)).toBe('Cellular Backup');
  });

  it('falls back to the raw add-on', () => {
    expect(addonName('SOMETHING')).toBe('SOMETHING');
  });
});

describe('level helpers', () => {
  it('recognises Pro Monitoring levels', () => {
    expect(isPromonLevel(Place.SERVICELEVEL_PREMIUM_PROMON)).toBe(true);
    expect(isPromonLevel(Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL)).toBe(true);
    expect(isPromonLevel(Place.SERVICELEVEL_PREMIUM_PROMON_FREE)).toBe(true);
    expect(isPromonLevel(Place.SERVICELEVEL_PREMIUM)).toBe(false);
    expect(isPromonLevel(undefined)).toBe(false);
  });

  it('treats premium and Pro Monitoring levels as premium', () => {
    expect(isPremiumLevel(Place.SERVICELEVEL_PREMIUM)).toBe(true);
    expect(isPremiumLevel(Place.SERVICELEVEL_PREMIUM_FREE)).toBe(true);
    expect(isPremiumLevel(Place.SERVICELEVEL_PREMIUM_ANNUAL)).toBe(true);
    expect(isPremiumLevel(Place.SERVICELEVEL_PREMIUM_PROMON)).toBe(true);
    expect(isPremiumLevel(Place.SERVICELEVEL_BASIC)).toBe(false);
    expect(isPremiumLevel(null)).toBe(false);
  });

  it('recognises Basic', () => {
    expect(isBasicLevel(Place.SERVICELEVEL_BASIC)).toBe(true);
    expect(isBasicLevel(Place.SERVICELEVEL_PREMIUM)).toBe(false);
    expect(isBasicLevel(undefined)).toBe(false);
  });
});

describe('SELECTABLE_PLANS', () => {
  it('offers Basic and Premium only', () => {
    expect(SELECTABLE_PLANS.map((p) => p.level)).toEqual([Place.SERVICELEVEL_BASIC, Place.SERVICELEVEL_PREMIUM]);
  });
});
