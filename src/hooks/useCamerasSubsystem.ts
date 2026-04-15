import { useMemo } from 'react';
import { Base, CamerasSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { useSubsystem } from './useSubsystem';

export function useCamerasSubsystem() {
  const sub = useSubsystem('subcameras');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const cameraAddrs = (sub?.[CamerasSubsystem.ATTR_CAMERAS] as string[]) ?? [];
    const cameras = allDevices.filter((d) => cameraAddrs.includes(d[Base.ATTR_ADDRESS]));
    const maxStreams = (sub?.[CamerasSubsystem.ATTR_MAXSIMULTANEOUSSTREAMS] as number) ?? 4;

    return {
      subsystem: sub,
      cameras,
      maxStreams,
    };
  }, [sub, allDevices]);
}
