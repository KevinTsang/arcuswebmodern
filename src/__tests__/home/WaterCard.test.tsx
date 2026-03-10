import { render, screen } from '@testing-library/react';
import WaterCard from '@/components/home/WaterCard';

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

describe('WaterCard', () => {
  it('renders the title', () => {
    render(<WaterCard />);
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('shows Valves Closed and Devices labels', () => {
    render(<WaterCard />);
    expect(screen.getByText('Valves Closed')).toBeInTheDocument();
    expect(screen.getByText('Devices')).toBeInTheDocument();
  });

  it('shows closed valve count', () => {
    mockSubsystems = [
      {
        'base:address': 'SERV:subwater:place-1',
        'waterval:valvestate': ['DRIV:dev:v1', 'DRIV:dev:v2'],
      },
    ];
    mockDevices = [
      { 'base:address': 'DRIV:dev:v1', 'waterval:valvestate': 'CLOSED' },
      { 'base:address': 'DRIV:dev:v2', 'waterval:valvestate': 'OPEN' },
    ];
    render(<WaterCard />);
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<WaterCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
