import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Person, Place, Account } from '@arcus/core';
import ProfileSection from '@/components/settings/ProfileSection';
import type { PersonEntity, AccountData, PlaceData } from '@/store/entityTypes';

const mockOpenRight = jest.fn();

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

let mockPerson: PersonEntity | null = null;
let mockAccount: AccountData | null = null;
let mockPlace: PlaceData | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      auth: { person: mockPerson, account: mockAccount },
      place: { place: mockPlace },
    }),
  useAppDispatch: () => jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPerson = {
    id: 'SERV:person:p1',
    [Person.ATTR_FIRSTNAME]: 'John',
    [Person.ATTR_LASTNAME]: 'Doe',
    [Person.ATTR_EMAIL]: 'john@test.com',
    [Person.ATTR_MOBILENUMBER]: '555-1234',
    [Base.ATTR_ADDRESS]: 'SERV:person:p1',
  };
  mockAccount = { [Account.ATTR_STATE]: 'ACTIVE', [Account.ATTR_OWNER]: 'SERV:person:p1', [Base.ATTR_ADDRESS]: 'SERV:account:a1' };
  mockPlace = { [Base.ATTR_ADDRESS]: 'SERV:place:place-1', [Base.ATTR_ID]: 'place-1', [Place.ATTR_SERVICELEVEL]: 'PREMIUM' };
});

describe('ProfileSection', () => {
  it('shows loading when no person', () => {
    mockPerson = null;
    render(<ProfileSection />);
    expect(screen.getByText('Loading profile…')).toBeInTheDocument();
  });

  it('shows contact information', () => {
    render(<ProfileSection />);
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('555-1234')).toBeInTheDocument();
  });

  it('shows password section', () => {
    render(<ProfileSection />);
    expect(screen.getAllByText('Password').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });

  it('shows service plan', () => {
    render(<ProfileSection />);
    expect(screen.getByText('Service Plan')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('shows account state', () => {
    render(<ProfileSection />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('opens ContactInfoPanel on Edit click', () => {
    render(<ProfileSection />);
    fireEvent.click(screen.getByText('Edit'));
    expect(mockOpenRight).toHaveBeenCalled();
  });

  it('opens ChangePasswordPanel on Change click', () => {
    render(<ProfileSection />);
    const changeButtons = screen.getAllByText('Change');
    // First "Change" is the Password card
    fireEvent.click(changeButtons[0]);
    expect(mockOpenRight).toHaveBeenCalled();
  });

  it('shows PIN Code card with Change button', () => {
    render(<ProfileSection />);
    expect(screen.getAllByText('PIN Code').length).toBeGreaterThanOrEqual(1);
    // Second "Change" is the PIN Code card
    const changeButtons = screen.getAllByText('Change');
    expect(changeButtons).toHaveLength(2);
  });

  it('opens ChangePinPanel on PIN Change click', () => {
    render(<ProfileSection />);
    const changeButtons = screen.getAllByText('Change');
    fireEvent.click(changeButtons[1]);
    expect(mockOpenRight).toHaveBeenCalled();
  });
});
