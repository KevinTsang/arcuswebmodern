import { render, screen, fireEvent } from '@testing-library/react';
import ProfileSection from '@/components/settings/ProfileSection';

const mockOpenRight = jest.fn();

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

let mockPerson: Record<string, unknown> | null = null;
let mockAccount: Record<string, unknown> | null = null;
let mockPlace: Record<string, unknown> | null = null;

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
    'person:firstName': 'John',
    'person:lastName': 'Doe',
    'person:email': 'john@test.com',
    'person:mobileNumber': '555-1234',
    'base:address': 'SERV:person:p1',
  };
  mockAccount = { 'account:state': 'ACTIVE', 'base:address': 'SERV:account:a1' };
  mockPlace = { 'place:serviceLevel': 'PREMIUM' };
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
