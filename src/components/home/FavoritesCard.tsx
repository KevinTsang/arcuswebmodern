import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { selectAllScenes } from '@/store/slices/scenesSlice';
import { isFavorite } from '@/lib/favorites';
import CardShell from './CardShell';
import FavoriteDeviceChip from './FavoriteDeviceChip';
import FavoriteSceneChip from './FavoriteSceneChip';

export default function FavoritesCard() {
  const devices = useAppSelector(selectAllDevices);
  const scenes = useAppSelector(selectAllScenes);

  const favoriteDevices = useMemo(
    () => devices.filter(isFavorite),
    [devices],
  );

  const favoriteScenes = useMemo(
    () => scenes.filter(isFavorite),
    [scenes],
  );

  const count = favoriteDevices.length + favoriteScenes.length;

  return (
    <CardShell title="Favorites" icon="icon-app-heart-2">
      {count > 0 ? (
        <>
          <p className="text-xs text-grouse mb-3">{count} favorite{count !== 1 ? 's' : ''}</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favoriteScenes.map((scene) => (
              <FavoriteSceneChip key={scene.id} scene={scene} />
            ))}
            {favoriteDevices.map((device) => (
              <FavoriteDeviceChip key={device.id} device={device} />
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
