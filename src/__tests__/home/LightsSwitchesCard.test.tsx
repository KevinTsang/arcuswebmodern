import { render, screen } from '@testing-library/react';
import LightsSwitchesCard from '@/components/home/LightsSwitchesCard';
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
      { id: 'SERV:sublightsnswitches:place-1', [Base.ATTR_ADDRESS]: 'SERV:sublightsnswitches:place-1', 'swit:state': ['DRIV:dev:sw1', 'DRIV:dev:sw2', 'DRIV:dev:sw3'] },
    ];
    mockDevices = [
      { id: 'DRIV:dev:sw1', [Base.ATTR_ADDRESS]: 'DRIV:dev:sw1', 'swit:state': 'ON' },
      { id: 'DRIV:dev:sw2', [Base.ATTR_ADDRESS]: 'DRIV:dev:sw2', 'swit:state': 'OFF' },
      { id: 'DRIV:dev:sw3', [Base.ATTR_ADDRESS]: 'DRIV:dev:sw3', 'swit:state': 'ON' },
    ];
    render(<LightsSwitchesCard />);
    expect(screen.getByTestId('status-value-on')).toHaveTextContent('2');
    expect(screen.getByTestId('status-value-total')).toHaveTextContent('3');
  });

  it('links to /services', () => {
    render(<LightsSwitchesCard />);
    expect(screen.getByTestId('card-view-link-lights-switches')).toHaveAttribute('href', '/services/lights-switches/status');
  });
});
