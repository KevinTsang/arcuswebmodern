import { render, screen } from '@testing-library/react';
import AlarmsCard from '@/components/home/AlarmsCard';
import { Base, Place } from '@arcus/core';
import type { SubsystemEntity, DeviceEntity, IncidentEntity, PlaceData } from '@/store/entityTypes';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

let mockPlace: Partial<PlaceData> | null = null;
let mockSubsystems: SubsystemEntity[] = [];
let mockDevices: DeviceEntity[] = [];
let mockIncidents: IncidentEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { place: mockPlace },
      subsystems: {
        entities: Object.fromEntries(mockSubsystems.map((s, i) => [`sub${i}`, s])),
        ids: mockSubsystems.map((_, i) => `sub${i}`),
      },
      devices: {
        entities: Object.fromEntries(mockDevices.map((d, i) => [`d${i}`, d])),
        ids: mockDevices.map((_, i) => `d${i}`),
      },
      incidents: {
        entities: Object.fromEntries(mockIncidents.map((inc, i) => [`inc${i}`, inc])),
        ids: mockIncidents.map((_, i) => `inc${i}`),
      },
    }),
}));

jest.mock('@/store/slices/subsystemsSlice', () => ({
  selectAllSubsystems: (state: any) => state.subsystems.ids.map((id: string) => state.subsystems.entities[id]),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: string) => state.devices.entities[id]),
}));

jest.mock('@/store/slices/incidentsSlice', () => ({
  selectAllIncidents: (state: any) => state.incidents.ids.map((id: string) => state.incidents.entities[id]),
}));

jest.mock('@/store/slices/peopleSlice', () => ({
  selectAllPeople: (state: any) => [],
}));

beforeEach(() => {
  mockPlace = { [Place.ATTR_NAME]: 'Home' };
  mockSubsystems = [];
  mockDevices = [];
  mockIncidents = [];
});

describe('AlarmsCard', () => {
  it('renders the Alarms title', () => {
    render(<AlarmsCard />);
    expect(screen.getByText('Alarms')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<AlarmsCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });

  it('shows Disarmed when no security subsystem', () => {
    render(<AlarmsCard />);
    expect(screen.getByText('Disarmed')).toBeInTheDocument();
  });

  it('shows security mode when armed', () => {
    mockSubsystems = [
      { id: 'SERV:subsecurity:place-1', [Base.ATTR_ADDRESS]: 'SERV:subsecurity:place-1', 'subsecurity:alarmMode': 'ON' },
    ];
    render(<AlarmsCard />);
    expect(screen.getByText('ON')).toBeInTheDocument();
  });

  it('shows Alarm Active when incident is ALERT', () => {
    mockIncidents = [
      { id: 'inc-1', [Base.ATTR_ADDRESS]: 'SERV:incident:inc-1', 'incident:alertState': 'ALERT', 'incident:alert': 'Smoke detected' },
    ];
    render(<AlarmsCard />);
    expect(screen.getByText('Alarm Active')).toBeInTheDocument();
    expect(screen.getByText('Smoke detected')).toBeInTheDocument();
  });

  it('shows Pro badge when service level includes PROMON', () => {
    mockPlace = { [Place.ATTR_NAME]: 'Home', [Place.ATTR_SERVICELEVEL]: 'PREMIUM_PROMON' };
    render(<AlarmsCard />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('does not show Pro badge without PROMON', () => {
    mockPlace = { [Place.ATTR_NAME]: 'Home', [Place.ATTR_SERVICELEVEL]: 'PREMIUM' };
    render(<AlarmsCard />);
    expect(screen.queryByText('Pro')).not.toBeInTheDocument();
  });

  it('shows offline device count', () => {
    mockSubsystems = [
      {
        id: 'SERV:subsecurity:place-1',
        [Base.ATTR_ADDRESS]: 'SERV:subsecurity:place-1',
        'subsecurity:alarmMode': 'OFF',
        'subsecurity:offlineDevices': ['dev-1', 'dev-2'],
      },
    ];
    render(<AlarmsCard />);
    expect(screen.getByText('2 offline')).toBeInTheDocument();
  });
});
