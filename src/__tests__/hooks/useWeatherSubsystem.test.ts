import { renderHook } from '@testing-library/react';
import { Device, WeatherRadio, WeatherSubsystem } from '@arcus/core';
import { useWeatherSubsystem, toWeatherRadioStatus } from '@/hooks/useWeatherSubsystem';
import type { SubsystemEntity, DeviceEntity } from '@/store/entityTypes';
import { makeDevice, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockUseSubsystem = jest.fn<SubsystemEntity | undefined, [string]>();
let mockDevices: DeviceEntity[] = [];

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: (ns: string) => mockUseSubsystem(ns),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => mockDevices,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SUB_ADDR = 'SERV:subweather:place-1';

function radio(address: string, overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(address, {
    [Device.ATTR_NAME]: `Radio ${address}`,
    [WeatherRadio.ATTR_ALERTSTATE]: WeatherRadio.ALERTSTATE_NO_ALERT,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = [];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useWeatherSubsystem', () => {
  it('reads the weather subsystem namespace', () => {
    mockUseSubsystem.mockReturnValue(undefined);
    renderHook(() => useWeatherSubsystem());
    expect(mockUseSubsystem).toHaveBeenCalledWith(WeatherSubsystem.NAMESPACE);
  });

  it('returns empty defaults without a subsystem', () => {
    mockUseSubsystem.mockReturnValue(undefined);
    mockDevices = [radio('DRIV:dev:r1')];

    const { result } = renderHook(() => useWeatherSubsystem());

    expect(result.current).toEqual({
      address: undefined,
      radios: [],
      alertingRadios: [],
      alertActive: false,
      lastAlertTime: undefined,
    });
  });

  it('lists the radios the subsystem tracks', () => {
    mockUseSubsystem.mockReturnValue(makeSubsystem(SUB_ADDR, {
      [WeatherSubsystem.ATTR_WEATHERRADIOS]: ['DRIV:dev:r1'],
      [WeatherSubsystem.ATTR_WEATHERALERT]: WeatherSubsystem.WEATHERALERT_READY,
      [WeatherSubsystem.ATTR_LASTWEATHERALERTTIME]: 1234,
    }));
    mockDevices = [radio('DRIV:dev:r1'), radio('DRIV:dev:other')];

    const { result } = renderHook(() => useWeatherSubsystem());

    expect(result.current.address).toBe(SUB_ADDR);
    expect(result.current.radios.map((r) => r.address)).toEqual(['DRIV:dev:r1']);
    expect(result.current.alertActive).toBe(false);
    expect(result.current.lastAlertTime).toBe(1234);
  });

  it('reports alerting radios from the subsystem list and the radio state', () => {
    mockUseSubsystem.mockReturnValue(makeSubsystem(SUB_ADDR, {
      [WeatherSubsystem.ATTR_WEATHERRADIOS]: ['DRIV:dev:r1', 'DRIV:dev:r2', 'DRIV:dev:r3'],
      [WeatherSubsystem.ATTR_ALERTINGRADIOS]: ['DRIV:dev:r1'],
      [WeatherSubsystem.ATTR_WEATHERALERT]: WeatherSubsystem.WEATHERALERT_ALERT,
    }));
    mockDevices = [
      radio('DRIV:dev:r1'),
      radio('DRIV:dev:r2', { [WeatherRadio.ATTR_ALERTSTATE]: WeatherRadio.ALERTSTATE_ALERT }),
      radio('DRIV:dev:r3'),
    ];

    const { result } = renderHook(() => useWeatherSubsystem());

    expect(result.current.alertActive).toBe(true);
    expect(result.current.alertingRadios.map((r) => r.address)).toEqual(['DRIV:dev:r1', 'DRIV:dev:r2']);
  });

  it('leaves out hushed radios', () => {
    mockUseSubsystem.mockReturnValue(makeSubsystem(SUB_ADDR, {
      [WeatherSubsystem.ATTR_WEATHERRADIOS]: ['DRIV:dev:r1'],
      [WeatherSubsystem.ATTR_ALERTINGRADIOS]: ['DRIV:dev:r1'],
    }));
    mockDevices = [radio('DRIV:dev:r1', { [WeatherRadio.ATTR_ALERTSTATE]: WeatherRadio.ALERTSTATE_HUSHED })];

    const { result } = renderHook(() => useWeatherSubsystem());

    expect(result.current.alertingRadios).toEqual([]);
  });
});

describe('toWeatherRadioStatus', () => {
  it('maps noaa attributes', () => {
    const status = toWeatherRadioStatus(radio('DRIV:dev:r1', {
      [WeatherRadio.ATTR_ALERTSTATE]: WeatherRadio.ALERTSTATE_ALERT,
      [WeatherRadio.ATTR_PLAYINGSTATE]: WeatherRadio.PLAYINGSTATE_PLAYING,
      [WeatherRadio.ATTR_CURRENTALERT]: 'TOR',
      [WeatherRadio.ATTR_LASTALERTTIME]: 99,
      [WeatherRadio.ATTR_STATIONSELECTED]: 3,
      [WeatherRadio.ATTR_FREQUENCY]: '162.400',
    }));

    expect(status).toEqual({
      address: 'DRIV:dev:r1',
      name: 'Radio DRIV:dev:r1',
      alertState: WeatherRadio.ALERTSTATE_ALERT,
      playingState: WeatherRadio.PLAYINGSTATE_PLAYING,
      currentAlert: 'TOR',
      lastAlertTime: 99,
      stationSelected: 3,
      frequency: '162.400',
    });
  });

  it('defaults the name when the device has none', () => {
    expect(toWeatherRadioStatus(makeDevice('DRIV:dev:x')).name).toBe('Weather Radio');
  });
});
