import { render, screen } from '@testing-library/react';
import FavoritesCard from '@/components/home/FavoritesCard';
import { Base, Device, Scene } from '@arcus/core';
import type { DeviceEntity, SceneEntity } from '@/store/entityTypes';

// Chip behavior is covered by FavoriteDeviceChip / FavoriteSceneChip tests;
// stub them so this suite focuses on the card's filtering and composition.
jest.mock('@/components/home/FavoriteDeviceChip', () => ({
  __esModule: true,
  default: ({ device }: any) => <div data-testid="device-chip">{device[Device.ATTR_NAME]}</div>,
}));
jest.mock('@/components/home/FavoriteSceneChip', () => ({
  __esModule: true,
  default: ({ scene }: any) => <div data-testid="scene-chip">{scene[Scene.ATTR_NAME]}</div>,
}));

let mockDevices: DeviceEntity[] = [];
let mockScenes: SceneEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      devices: {
        entities: Object.fromEntries(mockDevices.map((d, i) => [`d${i}`, d])),
        ids: mockDevices.map((_, i) => `d${i}`),
      },
      scenes: {
        entities: Object.fromEntries(mockScenes.map((s, i) => [`s${i}`, s])),
        ids: mockScenes.map((_, i) => `s${i}`),
      },
    }),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: string) => state.devices.entities[id]),
}));

jest.mock('@/store/slices/scenesSlice', () => ({
  selectAllScenes: (state: any) => state.scenes.ids.map((id: string) => state.scenes.entities[id]),
}));

function favDevice(name: string, i = 1): DeviceEntity {
  return { id: `d${i}`, [Base.ATTR_ADDRESS]: `DRIV:dev:d${i}`, [Device.ATTR_NAME]: name, [Base.ATTR_TAGS]: ['FAVORITE'] } as DeviceEntity;
}

function favScene(name: string, i = 1): SceneEntity {
  return { id: `s${i}`, [Base.ATTR_ADDRESS]: `SERV:scene:s${i}`, [Scene.ATTR_NAME]: name, [Base.ATTR_TAGS]: ['FAVORITE'] } as SceneEntity;
}

beforeEach(() => {
  mockDevices = [];
  mockScenes = [];
});

describe('FavoritesCard', () => {
  it('renders empty message when no favorites', () => {
    render(<FavoritesCard />);
    expect(screen.getByText('Mark devices and scenes as favorites to see them here.')).toBeInTheDocument();
  });

  it('renders a device chip for each favorited device (base:tags has FAVORITE)', () => {
    mockDevices = [favDevice('Lamp')];
    render(<FavoritesCard />);
    expect(screen.getByTestId('device-chip')).toHaveTextContent('Lamp');
  });

  it('renders a scene chip for each favorited scene', () => {
    mockScenes = [favScene('Movie Time')];
    render(<FavoritesCard />);
    expect(screen.getByTestId('scene-chip')).toHaveTextContent('Movie Time');
  });

  it('shows singular "favorite" for count of 1', () => {
    mockDevices = [favDevice('Lamp')];
    render(<FavoritesCard />);
    expect(screen.getByText('1 favorite')).toBeInTheDocument();
  });

  it('counts devices and scenes together with plural "favorites"', () => {
    mockDevices = [favDevice('Lamp', 1)];
    mockScenes = [favScene('Movie Time', 1), favScene('Goodnight', 2)];
    render(<FavoritesCard />);
    expect(screen.getByText('3 favorites')).toBeInTheDocument();
    expect(screen.getAllByTestId('device-chip')).toHaveLength(1);
    expect(screen.getAllByTestId('scene-chip')).toHaveLength(2);
  });

  it('excludes entities whose tags do not include FAVORITE', () => {
    mockDevices = [
      { id: 'd1', [Base.ATTR_ADDRESS]: 'DRIV:dev:d1', [Device.ATTR_NAME]: 'Lamp', [Base.ATTR_TAGS]: ['OTHER'] },
      { id: 'd2', [Base.ATTR_ADDRESS]: 'DRIV:dev:d2', [Device.ATTR_NAME]: 'Fan' },
    ];
    render(<FavoritesCard />);
    expect(screen.queryByTestId('device-chip')).not.toBeInTheDocument();
    expect(screen.getByText('Mark devices and scenes as favorites to see them here.')).toBeInTheDocument();
  });
});
