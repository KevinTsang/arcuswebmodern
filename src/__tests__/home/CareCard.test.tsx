import { render, screen } from '@testing-library/react';
import CareCard from '@/components/home/CareCard';
import { Base } from '@arcus/core';
import type { SubsystemEntity } from '@/store/entityTypes';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

let mockSubsystems: SubsystemEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      subsystems: {
        entities: Object.fromEntries(mockSubsystems.map((s, i) => [`sub${i}`, s])),
        ids: mockSubsystems.map((_, i) => `sub${i}`),
      },
      devices: { entities: {}, ids: [] },
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
});

describe('CareCard', () => {
  it('renders the title', () => {
    render(<CareCard />);
    expect(screen.getByText('Care')).toBeInTheDocument();
  });

  it('shows OK status by default', () => {
    render(<CareCard />);
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows Alert when alarm state is ALERT', () => {
    mockSubsystems = [
      { id: 'SERV:subcare:place-1', [Base.ATTR_ADDRESS]: 'SERV:subcare:place-1', 'subcare:alarmState': 'ALERT' },
    ];
    render(<CareCard />);
    expect(screen.getByText('Alert')).toBeInTheDocument();
  });

  it('shows behavior count', () => {
    mockSubsystems = [
      {
        id: 'SERV:subcare:place-1',
        [Base.ATTR_ADDRESS]: 'SERV:subcare:place-1',
        'subcare:behaviors': [{ name: 'b1' }, { name: 'b2' }],
      },
    ];
    render(<CareCard />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Behaviors')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<CareCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
