import { Shade, Somfyv1 } from '@arcus/core';
import {
  getBlindStatus, getShadeStatus, roundShadeLevel, stepShadeLevel,
} from '@/lib/shadeStatus';
import { makeDevice } from '../helpers/factories';

const ADDRESS = 'DRIV:dev:shade';

describe('roundShadeLevel', () => {
  it('rounds to the nearest 10%', () => {
    expect(roundShadeLevel(34)).toBe(30);
    expect(roundShadeLevel(35)).toBe(40);
    expect(roundShadeLevel(0)).toBe(0);
  });

  it('clamps to 0–100', () => {
    expect(roundShadeLevel(-20)).toBe(0);
    expect(roundShadeLevel(140)).toBe(100);
  });
});

describe('stepShadeLevel', () => {
  it('steps up and down by 10%', () => {
    expect(stepShadeLevel(30, 1)).toBe(40);
    expect(stepShadeLevel(30, -1)).toBe(20);
  });

  it('snaps an off-step level before stepping', () => {
    expect(stepShadeLevel(33, 1)).toBe(40);
    expect(stepShadeLevel(37, -1)).toBe(30);
  });

  it('stops at the ends', () => {
    expect(stepShadeLevel(100, 1)).toBe(100);
    expect(stepShadeLevel(0, -1)).toBe(0);
  });
});

describe('getShadeStatus', () => {
  it('reads the level', () => {
    expect(getShadeStatus(makeDevice(ADDRESS, { [Shade.ATTR_LEVEL]: 30 }))).toEqual({
      level: 30, obstructed: false, label: '30% Open',
    });
  });

  it('reports an obstruction over the level', () => {
    const status = getShadeStatus(makeDevice(ADDRESS, {
      [Shade.ATTR_LEVEL]: 30, [Shade.ATTR_SHADESTATE]: Shade.SHADESTATE_OBSTRUCTION,
    }));
    expect(status).toEqual({ level: 30, obstructed: true, label: 'Obstructed' });
  });

  it('rounds and clamps an out-of-range level', () => {
    expect(getShadeStatus(makeDevice(ADDRESS, { [Shade.ATTR_LEVEL]: 42.6 })).level).toBe(43);
    expect(getShadeStatus(makeDevice(ADDRESS, { [Shade.ATTR_LEVEL]: 120 })).level).toBe(100);
  });

  it('is Unknown without a numeric level or device', () => {
    expect(getShadeStatus(makeDevice(ADDRESS, { [Shade.ATTR_LEVEL]: '30' })).label).toBe('Unknown');
    expect(getShadeStatus(makeDevice(ADDRESS)).level).toBeNull();
    expect(getShadeStatus(undefined)).toEqual({ level: null, obstructed: false, label: 'Unknown' });
  });
});

describe('getBlindStatus', () => {
  it('uses Open/Close for blinds', () => {
    const status = getBlindStatus(makeDevice(ADDRESS, {
      [Somfyv1.ATTR_TYPE]: Somfyv1.TYPE_BLIND, [Somfyv1.ATTR_CURRENTSTATE]: Somfyv1.CURRENTSTATE_OPEN,
    }));
    expect(status).toEqual({ isBlind: true, openLabel: 'Open', closeLabel: 'Close', label: 'Open' });
    expect(getBlindStatus(makeDevice(ADDRESS, {
      [Somfyv1.ATTR_TYPE]: Somfyv1.TYPE_BLIND, [Somfyv1.ATTR_CURRENTSTATE]: Somfyv1.CURRENTSTATE_CLOSED,
    })).label).toBe('Closed');
  });

  it('uses Up/Down for shades, the default type', () => {
    const status = getBlindStatus(makeDevice(ADDRESS, {
      [Somfyv1.ATTR_TYPE]: Somfyv1.TYPE_SHADE, [Somfyv1.ATTR_CURRENTSTATE]: Somfyv1.CURRENTSTATE_CLOSED,
    }));
    expect(status).toEqual({ isBlind: false, openLabel: 'Up', closeLabel: 'Down', label: 'Down' });
    expect(getBlindStatus(makeDevice(ADDRESS, { [Somfyv1.ATTR_CURRENTSTATE]: Somfyv1.CURRENTSTATE_OPEN })).label)
      .toBe('Up');
  });

  it('is Unknown without a current state or device', () => {
    expect(getBlindStatus(makeDevice(ADDRESS)).label).toBe('Unknown');
    expect(getBlindStatus(undefined).openLabel).toBe('Up');
  });
});
