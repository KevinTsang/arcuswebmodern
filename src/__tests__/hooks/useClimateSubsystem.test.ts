import { renderHook } from '@testing-library/react';
import { ClimateSubsystem, Temperature, RelativeHumidity } from '@arcus/core';
import { useClimateSubsystem } from '@/hooks/useClimateSubsystem';
import type { SubsystemEntity, DeviceEntity } from '@/store/entityTypes';
import { makeDevice, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockUseSubsystem = jest.fn<SubsystemEntity | undefined, [string]>();
jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: (...args: [string]) => mockUseSubsystem(...args),
}));

const mockUseAppSelector = jest.fn();
jest.mock('@/store/hooks', () => ({
  useAppSelector: (...args: unknown[]) => mockUseAppSelector(...args),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: 'selectAllDevices',
}));

// ── Helpers ───────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSubsystem.mockReturnValue(undefined);
  mockUseAppSelector.mockReturnValue([]);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useClimateSubsystem', () => {
  it('returns defaults when subsystem is undefined', () => {
    mockUseSubsystem.mockReturnValue(undefined);
    mockUseAppSelector.mockReturnValue([]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.subsystem).toBeUndefined();
    expect(result.current.temperature).toBeUndefined();
    expect(result.current.humidity).toBeUndefined();
    expect(result.current.controlDevices).toEqual([]);
    expect(result.current.tempDevices).toEqual([]);
    expect(result.current.humidDevices).toEqual([]);
  });

  it('returns temperature from primary temperature device', () => {
    const tempDevice = makeDevice('DRIV:dev:temp1', {
      [Temperature.ATTR_TEMPERATURE]: 22.5,
    });
    const otherTempDevice = makeDevice('DRIV:dev:temp2', {
      [Temperature.ATTR_TEMPERATURE]: 18.0,
    });

    mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subclimate:1', {
      [ClimateSubsystem.ATTR_PRIMARYTEMPERATUREDEVICE]: 'DRIV:dev:temp1',
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: ['DRIV:dev:temp1', 'DRIV:dev:temp2'],
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: [],
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: [],
    }));
    mockUseAppSelector.mockReturnValue([tempDevice, otherTempDevice]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.temperature).toBe(22.5);
  });

  it('returns humidity from primary humidity device', () => {
    const humidDevice = makeDevice('DRIV:dev:humid1', {
      [RelativeHumidity.ATTR_HUMIDITY]: 55,
    });
    const otherHumidDevice = makeDevice('DRIV:dev:humid2', {
      [RelativeHumidity.ATTR_HUMIDITY]: 40,
    });

    mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subclimate:1', {
      [ClimateSubsystem.ATTR_PRIMARYHUMIDITYDEVICE]: 'DRIV:dev:humid1',
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: ['DRIV:dev:humid1', 'DRIV:dev:humid2'],
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: [],
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: [],
    }));
    mockUseAppSelector.mockReturnValue([humidDevice, otherHumidDevice]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.humidity).toBe(55);
  });

  it('filters control, temp, and humid devices from all devices', () => {
    const thermostat = makeDevice('DRIV:dev:therm1');
    const tempSensor = makeDevice('DRIV:dev:temp1', {
      [Temperature.ATTR_TEMPERATURE]: 20,
    });
    const humidSensor = makeDevice('DRIV:dev:humid1', {
      [RelativeHumidity.ATTR_HUMIDITY]: 45,
    });
    const unrelatedDevice = makeDevice('DRIV:dev:other1');

    mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subclimate:1', {
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: ['DRIV:dev:therm1'],
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: ['DRIV:dev:temp1'],
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: ['DRIV:dev:humid1'],
      [ClimateSubsystem.ATTR_PRIMARYTEMPERATUREDEVICE]: 'DRIV:dev:temp1',
      [ClimateSubsystem.ATTR_PRIMARYHUMIDITYDEVICE]: 'DRIV:dev:humid1',
    }));
    mockUseAppSelector.mockReturnValue([thermostat, tempSensor, humidSensor, unrelatedDevice]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.controlDevices).toEqual([thermostat]);
    expect(result.current.tempDevices).toEqual([tempSensor]);
    expect(result.current.humidDevices).toEqual([humidSensor]);
    expect(result.current.controlDevices).not.toContainEqual(unrelatedDevice);
    expect(result.current.tempDevices).not.toContainEqual(unrelatedDevice);
    expect(result.current.humidDevices).not.toContainEqual(unrelatedDevice);
  });

  it('falls back to first temp device when no primary specified', () => {
    const firstTempDevice = makeDevice('DRIV:dev:temp1', {
      [Temperature.ATTR_TEMPERATURE]: 19.0,
    });
    const secondTempDevice = makeDevice('DRIV:dev:temp2', {
      [Temperature.ATTR_TEMPERATURE]: 25.0,
    });

    mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subclimate:1', {
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: ['DRIV:dev:temp1', 'DRIV:dev:temp2'],
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: [],
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: [],
      // No ATTR_PRIMARYTEMPERATUREDEVICE set
    }));
    mockUseAppSelector.mockReturnValue([firstTempDevice, secondTempDevice]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.temperature).toBe(19.0);
  });

  it('falls back to first humid device when no primary specified', () => {
    const firstHumidDevice = makeDevice('DRIV:dev:humid1', {
      [RelativeHumidity.ATTR_HUMIDITY]: 60,
    });
    const secondHumidDevice = makeDevice('DRIV:dev:humid2', {
      [RelativeHumidity.ATTR_HUMIDITY]: 35,
    });

    mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subclimate:1', {
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: ['DRIV:dev:humid1', 'DRIV:dev:humid2'],
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: [],
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: [],
      // No ATTR_PRIMARYHUMIDITYDEVICE set
    }));
    mockUseAppSelector.mockReturnValue([firstHumidDevice, secondHumidDevice]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.humidity).toBe(60);
  });

  it('returns correct subsystem reference', () => {
    const subsystem = makeSubsystem('SERV:subclimate:1', {
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: [],
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: [],
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: [],
    });

    mockUseSubsystem.mockReturnValue(subsystem);
    mockUseAppSelector.mockReturnValue([]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.subsystem).toBe(subsystem);
  });

  it('calls useSubsystem with subclimate namespace', () => {
    renderHook(() => useClimateSubsystem());

    expect(mockUseSubsystem).toHaveBeenCalledWith('subclimate');
  });

  it('returns undefined temperature when no temp devices exist', () => {
    mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subclimate:1', {
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: [],
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: [],
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: [],
    }));
    mockUseAppSelector.mockReturnValue([]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.temperature).toBeUndefined();
    expect(result.current.humidity).toBeUndefined();
  });

  it('returns undefined temperature when primary device is not in allDevices', () => {
    mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subclimate:1', {
      [ClimateSubsystem.ATTR_PRIMARYTEMPERATUREDEVICE]: 'DRIV:dev:missing',
      [ClimateSubsystem.ATTR_TEMPERATUREDEVICES]: ['DRIV:dev:missing'],
      [ClimateSubsystem.ATTR_HUMIDITYDEVICES]: [],
      [ClimateSubsystem.ATTR_CONTROLDEVICES]: [],
    }));
    mockUseAppSelector.mockReturnValue([]);

    const { result } = renderHook(() => useClimateSubsystem());

    expect(result.current.temperature).toBeUndefined();
  });
});
