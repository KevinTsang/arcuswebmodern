import { render, screen } from '@testing-library/react';
import LawnGardenCard from '@/components/home/LawnGardenCard';
import { Base } from '@arcus/core';
import type { SubsystemEntity, DeviceEntity } from '@/store/entityTypes';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

let mockSubsystems: SubsystemEntity[] = [];
let mockDevices: DeviceEntity[] = [];

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
        id: 'SERV:sublawnngarden:place-1',
        [Base.ATTR_ADDRESS]: 'SERV:sublawnngarden:place-1',
        // Platform sends zonesWatering as a map keyed by controller address.
        'sublawnngarden:zonesWatering': {
          'DRIV:dev:ctrl1': { controller: 'DRIV:dev:ctrl1', zone: 'z1' },
          'DRIV:dev:ctrl2': { controller: 'DRIV:dev:ctrl2', zone: 'z2' },
        },
        'sublawnngarden:controllers': ['DRIV:dev:ctrl1'],
      },
    ];
    mockDevices = [
      { id: 'DRIV:dev:ctrl1', [Base.ATTR_ADDRESS]: 'DRIV:dev:ctrl1' },
    ];
    render(<LawnGardenCard />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows 0 rather than "undefined" when no zones are watering', () => {
    // Regression: the platform sends an empty map `{}` when nothing is
    // watering; the card used to render "undefined" for the count.
    mockSubsystems = [
      {
        id: 'SERV:sublawnngarden:place-1',
        [Base.ATTR_ADDRESS]: 'SERV:sublawnngarden:place-1',
        'sublawnngarden:zonesWatering': {},
        'sublawnngarden:controllers': ['DRIV:dev:ctrl1'],
      },
    ];
    mockDevices = [
      { id: 'DRIV:dev:ctrl1', [Base.ATTR_ADDRESS]: 'DRIV:dev:ctrl1' },
    ];
    render(<LawnGardenCard />);
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    // Watering badge shows 0
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<LawnGardenCard />);
    expect(screen.getByTestId('card-view-link-lawn-garden')).toHaveAttribute('href', '/services/lawn-garden/status');
  });
});
