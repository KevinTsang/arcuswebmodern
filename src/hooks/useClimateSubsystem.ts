import { useMemo } from 'react';
import { Base, Temperature, RelativeHumidity, ClimateSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { useSubsystem } from './useSubsystem';

export function useClimateSubsystem() {
  const sub = useSubsystem('subclimate');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const primaryTempDevice = sub?.[ClimateSubsystem.ATTR_PRIMARYTEMPERATUREDEVICE] as string | undefined;
    const primaryHumidDevice = sub?.[ClimateSubsystem.ATTR_PRIMARYHUMIDITYDEVICE] as string | undefined;
    const tempDeviceAddrs = (sub?.[ClimateSubsystem.ATTR_TEMPERATUREDEVICES] as string[]) ?? [];
    const humidDeviceAddrs = (sub?.[ClimateSubsystem.ATTR_HUMIDITYDEVICES] as string[]) ?? [];
    const controlDeviceAddrs = (sub?.[ClimateSubsystem.ATTR_CONTROLDEVICES] as string[]) ?? [];

    const controlDevices = allDevices.filter((d) => controlDeviceAddrs.includes(d[Base.ATTR_ADDRESS]));
    const tempDevices = allDevices.filter((d) => tempDeviceAddrs.includes(d[Base.ATTR_ADDRESS]));
    const humidDevices = allDevices.filter((d) => humidDeviceAddrs.includes(d[Base.ATTR_ADDRESS]));

    // Get primary readings
    const primaryTempEntity = primaryTempDevice
      ? allDevices.find((d) => d[Base.ATTR_ADDRESS] === primaryTempDevice)
      : tempDevices[0];
    const primaryHumidEntity = primaryHumidDevice
      ? allDevices.find((d) => d[Base.ATTR_ADDRESS] === primaryHumidDevice)
      : humidDevices[0];

    const temperature = primaryTempEntity?.[Temperature.ATTR_TEMPERATURE] as number | undefined;
    const humidity = primaryHumidEntity?.[RelativeHumidity.ATTR_HUMIDITY] as number | undefined;

    return {
      subsystem: sub,
      temperature,
      humidity,
      controlDevices,
      tempDevices,
      humidDevices,
    };
  }, [sub, allDevices]);
}
