import { render, screen } from '@testing-library/react';
import HomeFamilyCard from '@/components/home/HomeFamilyCard';
import { Base, Person } from '@arcus/core';
import type { SubsystemEntity, PersonEntity } from '@/store/entityTypes';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

let mockSubsystems: SubsystemEntity[] = [];
let mockPeople: PersonEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      subsystems: {
        entities: Object.fromEntries(mockSubsystems.map((s, i) => [`sub${i}`, s])),
        ids: mockSubsystems.map((_, i) => `sub${i}`),
      },
      devices: { entities: {}, ids: [] },
      people: {
        entities: Object.fromEntries(mockPeople.map((p, i) => [`p${i}`, p])),
        ids: mockPeople.map((_, i) => `p${i}`),
      },
    }),
}));

jest.mock('@/store/slices/subsystemsSlice', () => ({
  selectAllSubsystems: (state: any) => state.subsystems.ids.map((id: string) => state.subsystems.entities[id]),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: string) => state.devices.entities[id]),
}));

jest.mock('@/store/slices/peopleSlice', () => ({
  selectAllPeople: (state: any) => state.people.ids.map((id: string) => state.people.entities[id]),
}));

beforeEach(() => {
  mockSubsystems = [];
  mockPeople = [];
});

describe('HomeFamilyCard', () => {
  it('renders the title', () => {
    render(<HomeFamilyCard />);
    expect(screen.getByText('Home & Family')).toBeInTheDocument();
  });

  it('shows Home and Away labels', () => {
    render(<HomeFamilyCard />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Away')).toBeInTheDocument();
  });

  it('shows people at home count', () => {
    mockSubsystems = [
      {
        id: 'SERV:subspres:place-1',
        [Base.ATTR_ADDRESS]: 'SERV:subspres:place-1',
        'subspres:peopleAtHome': ['SERV:person:p1'],
        'subspres:peopleAway': [],
      },
    ];
    mockPeople = [
      { id: 'SERV:person:p1', [Base.ATTR_ADDRESS]: 'SERV:person:p1', [Person.ATTR_FIRSTNAME]: 'Alice' },
    ];
    render(<HomeFamilyCard />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<HomeFamilyCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
