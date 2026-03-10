import { render, screen } from '@testing-library/react';
import DoorsLocksCard from '@/components/home/DoorsLocksCard';

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

describe('DoorsLocksCard', () => {
  it('renders the title', () => {
    render(<DoorsLocksCard />);
    expect(screen.getByText('Doors & Locks')).toBeInTheDocument();
  });

  it('shows zero counts when no devices', () => {
    render(<DoorsLocksCard />);
    expect(screen.getByText('Unlocked')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('shows unlocked count for unlocked locks', () => {
    mockSubsystems = [
      {
        'base:address': 'SERV:subdoorsnlocks:place-1',
        'subdoorsnlocks:lockDevices': ['DRIV:dev:lock1', 'DRIV:dev:lock2'],
      },
    ];
    mockDevices = [
      { 'base:address': 'DRIV:dev:lock1', 'doorlock:lockstate': 'UNLOCKED' },
      { 'base:address': 'DRIV:dev:lock2', 'doorlock:lockstate': 'LOCKED' },
    ];
    render(<DoorsLocksCard />);
    // Total should be 2 (locks only, no contacts)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<DoorsLocksCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
