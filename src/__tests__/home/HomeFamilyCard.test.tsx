import { render, screen } from '@testing-library/react';
import HomeFamilyCard from '@/components/home/HomeFamilyCard';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

let mockSubsystems: Record<string, unknown>[] = [];
let mockPeople: Record<string, unknown>[] = [];

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
        'base:address': 'SERV:subspres:place-1',
        'subspres:peopleAtHome': ['SERV:person:p1'],
        'subspres:peopleAway': [],
      },
    ];
    mockPeople = [
      { 'base:address': 'SERV:person:p1', 'person:firstName': 'Alice' },
    ];
    render(<HomeFamilyCard />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('links to /services', () => {
    render(<HomeFamilyCard />);
    expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services');
  });
});
