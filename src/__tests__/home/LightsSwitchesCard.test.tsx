import { render, screen } from '@testing-library/react';
import LightsSwitchesCard from '@/components/home/LightsSwitchesCard';

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

describe('LightsSwitchesCard', () => {
  it('renders the title', () => {
    render(<LightsSwitchesCard />);
    expect(screen.getByText('Lights & Switches')).toBeInTheDocument();
  });

  it('shows On and Total labels', () => {
    render(<LightsSwitchesCard />);
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('counts lights that are ON', () => {
    mockSubsystems = [
      { 'base:address': 'SERV:sublightsnswitches:place-1', 'swit:state': ['DRIV:dev:sw1', 'DRIV:dev:sw2', 'DRIV:dev:sw3'] },
    ];
    mockDevices = [
      { 'base:address': 'DRIV:dev:sw1', 'swit:state': 'ON' },
      { 'base:address': 'DRIV:dev:sw2', 'swit:state': 'OFF' },
      { 'base:address': 'DRIV:dev:sw3', 'swit:state': 'ON' },
    ];
    render(<LightsSwitchesCard />);
    const onValue = screen.getByText('On').closest('div')!.querySelector('p')!;
    expect(onValue.textContent).toBe('2');
    const totalValue = screen.getByText('Total').closest('div')!.querySelector('p')!;
    expect(totalValue.textContent).toBe('3');
  });

  it('links to /services', () => {
    render(<LightsSwitchesCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
