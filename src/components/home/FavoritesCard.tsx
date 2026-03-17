import { useMemo } from 'react';
import { Device, Scene } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { selectAllScenes } from '@/store/slices/scenesSlice';
import CardShell from './CardShell';

export default function FavoritesCard() {
  const devices = useAppSelector(selectAllDevices);
  const scenes = useAppSelector(selectAllScenes);

  const favoriteDevices = useMemo(
    () => devices.filter((d) => d['isFavorite'] === true || d['dev:favorite'] === true),
    [devices],
  );

  const favoriteScenes = useMemo(
    () => scenes.filter((s) => s['scene:favorite'] === true),
    [scenes],
  );

  const count = favoriteDevices.length + favoriteScenes.length;

  return (
    <CardShell title="Favorites" icon="icon-app-heart-2">
      {count > 0 ? (
        <>
          <p className="text-xs text-grouse mb-3">{count} favorite{count !== 1 ? 's' : ''}</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favoriteDevices.map((device) => (
              <FavoriteDeviceChip key={device.id} device={device} />
            ))}
            {favoriteScenes.map((scene) => (
              <FavoriteSceneChip key={scene.id} scene={scene} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-grouse">
          Mark devices and scenes as favorites to see them here.
        </p>
      )}
    </CardShell>
  );
}

function FavoriteDeviceChip({ device }: { device: Record<string, unknown> }) {
  const name = (device[Device.ATTR_NAME] as string) ?? 'Device';
  return (
    <div className="flex-shrink-0 w-28 text-center p-2 border border-heron rounded-[var(--border-radius-base)]">
      <div className="w-10 h-10 bg-pigeon/50 rounded-full flex items-center justify-center mx-auto mb-1">
        <span className="icon-app-devices text-sm text-grouse" />
      </div>
      <p className="text-xs text-swift truncate">{name}</p>
    </div>
  );
}

function FavoriteSceneChip({ scene }: { scene: Record<string, unknown> }) {
  const name = (scene[Scene.ATTR_NAME] as string) ?? 'Scene';
  return (
    <div className="flex-shrink-0 w-28 text-center p-2 border border-heron rounded-[var(--border-radius-base)]">
      <div className="w-10 h-10 bg-peacock/10 rounded-full flex items-center justify-center mx-auto mb-1">
        <span className="icon-app-scene text-sm text-peacock" />
      </div>
      <p className="text-xs text-swift truncate">{name}</p>
    </div>
  );
}
