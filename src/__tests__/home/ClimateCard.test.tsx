import { render, screen } from '@testing-library/react';
import ClimateCard from '@/components/home/ClimateCard';

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

jest.mock('@/hooks/useDeviceConfig', () => ({
  cToF: (c: number) => c * 9 / 5 + 32,
  formatTemp: (c: number) => `${Math.round(c * 9 / 5 + 32)}°F`,
}));

beforeEach(() => {
  mockSubsystems = [];
  mockDevices = [];
});

describe('ClimateCard', () => {
  it('renders the Climate title', () => {
    render(<ClimateCard />);
    expect(screen.getByText('Climate')).toBeInTheDocument();
  });

  it('shows "No climate data available." when no data', () => {
    render(<ClimateCard />);
    expect(screen.getByText('No climate data available.')).toBeInTheDocument();
  });

  it('shows temperature when primary temp device has data', () => {
    mockSubsystems = [
      {
        'base:address': 'SERV:subclimate:place-1',
        'subclimate:primaryTemperatureDevice': 'DRIV:dev:therm1',
        'subclimate:temperatureDevices': ['DRIV:dev:therm1'],
      },
    ];
    mockDevices = [
      { 'base:address': 'DRIV:dev:therm1', 'temp:temperature': 22 },
    ];
    render(<ClimateCard />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
  });

  it('shows humidity when primary humidity device has data', () => {
    mockSubsystems = [
      {
        'base:address': 'SERV:subclimate:place-1',
        'subclimate:primaryHumidityDevice': 'DRIV:dev:hum1',
        'subclimate:humidityDevices': ['DRIV:dev:hum1'],
      },
    ];
    mockDevices = [
      { 'base:address': 'DRIV:dev:hum1', 'humid:humidity': 55 },
    ];
    render(<ClimateCard />);
    expect(screen.getByText('Humidity')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<ClimateCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
