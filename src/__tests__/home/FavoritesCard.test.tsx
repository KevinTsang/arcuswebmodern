import { render, screen } from '@testing-library/react';
import FavoritesCard from '@/components/home/FavoritesCard';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

let mockDevices: Record<string, unknown>[] = [];
let mockScenes: Record<string, unknown>[] = [];

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

beforeEach(() => {
  mockDevices = [];
  mockScenes = [];
});

describe('FavoritesCard', () => {
  it('renders empty message when no favorites', () => {
    render(<FavoritesCard />);
    expect(screen.getByText('Mark devices and scenes as favorites to see them here.')).toBeInTheDocument();
  });

  it('renders favorite device names', () => {
    mockDevices = [
      { id: 'd1', 'base:address': 'DRIV:dev:d1', 'dev:name': 'Lamp', 'dev:favorite': true },
    ];
    render(<FavoritesCard />);
    expect(screen.getByText('Lamp')).toBeInTheDocument();
  });

  it('renders favorite scene names', () => {
    mockScenes = [
      { id: 's1', 'base:address': 'SERV:scene:s1', 'scene:name': 'Movie Time', 'scene:favorite': true },
    ];
    render(<FavoritesCard />);
    expect(screen.getByText('Movie Time')).toBeInTheDocument();
  });

  it('shows singular "favorite" for count of 1', () => {
    mockDevices = [
      { id: 'd1', 'base:address': 'DRIV:dev:d1', 'dev:name': 'Lamp', 'dev:favorite': true },
    ];
    render(<FavoritesCard />);
    expect(screen.getByText('1 favorite')).toBeInTheDocument();
  });

  it('shows plural "favorites" for count > 1', () => {
    mockDevices = [
      { id: 'd1', 'base:address': 'DRIV:dev:d1', 'dev:name': 'Lamp', 'dev:favorite': true },
      { id: 'd2', 'base:address': 'DRIV:dev:d2', 'dev:name': 'Fan', 'isFavorite': true },
    ];
    render(<FavoritesCard />);
    expect(screen.getByText('2 favorites')).toBeInTheDocument();
  });

  it('excludes non-favorite devices', () => {
    mockDevices = [
      { id: 'd1', 'base:address': 'DRIV:dev:d1', 'dev:name': 'Lamp', 'dev:favorite': false },
    ];
    render(<FavoritesCard />);
    expect(screen.queryByText('Lamp')).not.toBeInTheDocument();
  });

  it('recognizes both isFavorite and dev:favorite flags', () => {
    mockDevices = [
      { id: 'd1', 'base:address': 'DRIV:dev:d1', 'dev:name': 'A', 'dev:favorite': true },
      { id: 'd2', 'base:address': 'DRIV:dev:d2', 'dev:name': 'B', 'isFavorite': true },
    ];
    render(<FavoritesCard />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
