import { renderHook } from '@testing-library/react';
import { shallowEqual } from 'react-redux';
import { Base, Device, WeatherRadio, WeatherSubsystem } from '@arcus/core';
import { useWeatherSubsystem, toWeatherRadioStatus } from '@/hooks/useWeatherSubsystem';
import type { SubsystemEntity, DeviceEntity } from '@/store/entityTypes';
import { makeDevice, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockUseSubsystem = jest.fn<SubsystemEntity | undefined, [string]>();
let mockDevices: DeviceEntity[] = [];

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: (ns: string) => mockUseSubsystem(ns),
}));

const mockUseAppSelector = jest.fn();

jest.mock('@/store/hooks', () => ({
  useAppSelector: (...args: unknown[]) => mockUseAppSelector(...args),
}));

function storeState() {
  return { devices: { entities: Object.fromEntries(mockDevices.map((d) => [d[Base.ATTR_ADDRESS], d])) } };
}

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
  mockUseAppSelector.mockImplementation((selector: (s: ReturnType<typeof storeState>) => unknown) => selector(storeState()));
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

    expect(result.current.alertingRadios.map((r) => r.address)).toEqual(['DRIV:dev:r1', 'DRIV:dev:r2']);
  });

  it('keeps the subsystem\'s order and skips radios not loaded yet', () => {
    mockUseSubsystem.mockReturnValue(makeSubsystem(SUB_ADDR, {
      [WeatherSubsystem.ATTR_WEATHERRADIOS]: ['DRIV:dev:r2', 'DRIV:dev:missing', 'DRIV:dev:r1'],
    }));
    mockDevices = [radio('DRIV:dev:r1'), radio('DRIV:dev:r2')];

    const { result } = renderHook(() => useWeatherSubsystem());

    expect(result.current.radios.map((r) => r.address)).toEqual(['DRIV:dev:r2', 'DRIV:dev:r1']);
  });

  it('compares the selected radios item by item, so other devices\' updates are ignored', () => {
    mockUseSubsystem.mockReturnValue(makeSubsystem(SUB_ADDR, {
      [WeatherSubsystem.ATTR_WEATHERRADIOS]: ['DRIV:dev:r1'],
    }));
    renderHook(() => useWeatherSubsystem());

    expect(mockUseAppSelector).toHaveBeenCalledWith(expect.any(Function), shallowEqual);
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
    }));

    expect(status).toEqual({
      address: 'DRIV:dev:r1',
      name: 'Radio DRIV:dev:r1',
      alertState: WeatherRadio.ALERTSTATE_ALERT,
      playingState: WeatherRadio.PLAYINGSTATE_PLAYING,
      currentAlert: 'TOR',
      lastAlertTime: 99,
    });
  });

  it('defaults the name when the device has none', () => {
    expect(toWeatherRadioStatus(makeDevice('DRIV:dev:x')).name).toBe('Weather Radio');
  });
});
