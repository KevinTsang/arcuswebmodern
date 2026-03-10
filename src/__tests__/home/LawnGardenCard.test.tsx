import { render, screen } from '@testing-library/react';
import LawnGardenCard from '@/components/home/LawnGardenCard';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

let mockSubsystems: Record<string, unknown>[] = [];
let mockDevices: Record<string, unknown>[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      subsystems: {
        entities: Object.fromEntries(mockSubsystems.map((s, i) => [`sub${i}`, s])),
        ids: mockSubsystems.map((_, i) => `sub${i}`),
      },
      devices: {
        entities: Object.fromEntries(mockDevices.map((d, i) => [`d${i}`, d])),
        ids: mockDevices.map((_, i) => `d${i}`),
      },
    }),
}));

jest.mock('@/store/slices/subsystemsSlice', () => ({
  selectAllSubsystems: (state: any) => state.subsystems.ids.map((id: string) => state.subsystems.entities[id]),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: string) => state.devices.entities[id]),
}));

beforeEach(() => {
  mockSubsystems = [];
  mockDevices = [];
});

describe('LawnGardenCard', () => {
  it('renders the title', () => {
    render(<LawnGardenCard />);
    expect(screen.getByText('Lawn & Garden')).toBeInTheDocument();
  });

  it('shows Watering and Controllers labels', () => {
    render(<LawnGardenCard />);
    expect(screen.getByText('Watering')).toBeInTheDocument();
    expect(screen.getByText('Controllers')).toBeInTheDocument();
  });

  it('shows active watering zone count', () => {
    mockSubsystems = [
      {
        'base:address': 'SERV:sublawnngarden:place-1',
        'sublawnngarden:zonesWatering': [{ zone: 1 }, { zone: 2 }],
        'sublawnngarden:controllers': ['DRIV:dev:ctrl1'],
      },
    ];
    mockDevices = [
      { 'base:address': 'DRIV:dev:ctrl1' },
    ];
    render(<LawnGardenCard />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<LawnGardenCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
