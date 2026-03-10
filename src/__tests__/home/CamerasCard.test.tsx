import { render, screen } from '@testing-library/react';
import CamerasCard from '@/components/home/CamerasCard';

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

describe('CamerasCard', () => {
  it('renders the title', () => {
    render(<CamerasCard />);
    expect(screen.getByText('Cameras')).toBeInTheDocument();
  });

  it('shows "0 cameras" when no cameras', () => {
    render(<CamerasCard />);
    expect(screen.getByText('0 cameras')).toBeInTheDocument();
  });

  it('shows singular "camera" for 1 camera', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subcameras:place-1', 'subcameras:cameras': ['DRIV:dev:cam1'] },
    ];
    mockDevices = [
      { 'base:address': 'DRIV:dev:cam1' },
    ];
    render(<CamerasCard />);
    expect(screen.getByText('1 camera')).toBeInTheDocument();
  });

  it('shows plural "cameras" for multiple', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:subcameras:place-1', 'subcameras:cameras': ['DRIV:dev:cam1', 'DRIV:dev:cam2'] },
    ];
    mockDevices = [
      { 'base:address': 'DRIV:dev:cam1' },
      { 'base:address': 'DRIV:dev:cam2' },
    ];
    render(<CamerasCard />);
    expect(screen.getByText('2 cameras')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<CamerasCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
