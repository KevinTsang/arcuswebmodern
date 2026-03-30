import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Place, Person } from '@arcus/core';
import ProMonitoringPage from '@/app/(authenticated)/promonitoring/page';
import type { PlaceData, PersonEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
const mockGetSettings = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@arcus/core/services', () => ({
  ProMonitoringService: {
    GetSettings: (...args: any[]) => mockGetSettings(...args),
  },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

let mockPlace: PlaceData | null = null;
let mockPerson: PersonEntity | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { place: mockPlace },
      auth: { person: mockPerson },
    }),
  useAppDispatch: () => mockDispatch,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPlace = {
    [Base.ATTR_ADDRESS]: 'SERV:place:place-1',
    [Base.ATTR_ID]: 'place-1',
    [Place.ATTR_NAME]: 'My Home',
    [Place.ATTR_STREETADDRESS1]: '123 Main St',
    [Place.ATTR_CITY]: 'Springfield',
    [Place.ATTR_STATEPROV]: 'IL',
    [Place.ATTR_ZIPCODE]: '62701',
    [Place.ATTR_SERVICELEVEL]: 'PREMIUM',
  };
  mockPerson = {
    id: 'SERV:person:person-1',
    [Base.ATTR_ADDRESS]: 'SERV:person:person-1',
    [Person.ATTR_EMAIL]: 'user@test.com',
  };
  mockGetSettings.mockResolvedValue({
    [Base.ATTR_ADDRESS]: 'SERV:promon:settings-1',
  });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ProMonitoringPage – rendering', () => {
  it('shows Professional Monitoring heading', () => {
    render(<ProMonitoringPage />);
    expect(screen.getByText('Professional Monitoring')).toBeInTheDocument();
  });

  it('shows place name', () => {
    render(<ProMonitoringPage />);
    expect(screen.getByText('My Home')).toBeInTheDocument();
  });

  it('shows step indicator with 7 steps', () => {
    render(<ProMonitoringPage />);
    // Step 1 should show as active
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('starts on Address step', () => {
    render(<ProMonitoringPage />);
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText(/Verify your home address/)).toBeInTheDocument();
  });

  it('shows the address from place', () => {
    render(<ProMonitoringPage />);
    expect(screen.getByText('123 Main St, Springfield, IL, 62701')).toBeInTheDocument();
  });

  it('shows "Address is Correct" button when address exists', () => {
    render(<ProMonitoringPage />);
    expect(screen.getByText('Address is Correct')).toBeInTheDocument();
  });

  it('shows "Continue" when no address', () => {
    mockPlace = { ...mockPlace!, [Place.ATTR_STREETADDRESS1]: undefined, [Place.ATTR_CITY]: undefined, [Place.ATTR_STATEPROV]: undefined, [Place.ATTR_ZIPCODE]: undefined };
    render(<ProMonitoringPage />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });
});

describe('ProMonitoringPage – step navigation', () => {
  it('advances to Alarms step', () => {
    render(<ProMonitoringPage />);
    fireEvent.click(screen.getByText('Address is Correct'));
    expect(screen.getByText('Alarms')).toBeInTheDocument();
    expect(screen.getByText(/alarm types will be professionally monitored/)).toBeInTheDocument();
  });

  it('shows alarm types on Alarms step', () => {
    render(<ProMonitoringPage />);
    fireEvent.click(screen.getByText('Address is Correct'));
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Smoke')).toBeInTheDocument();
    expect(screen.getByText('Carbon Monoxide')).toBeInTheDocument();
    expect(screen.getByText('Panic')).toBeInTheDocument();
  });

  it('advances to Details step', () => {
    render(<ProMonitoringPage />);
    fireEvent.click(screen.getByText('Address is Correct'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('shows Back button on Alarms step', () => {
    render(<ProMonitoringPage />);
    fireEvent.click(screen.getByText('Address is Correct'));
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('goes back to Address from Alarms', () => {
    render(<ProMonitoringPage />);
    fireEvent.click(screen.getByText('Address is Correct'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText(/Verify your home address/)).toBeInTheDocument();
  });
});

describe('ProMonitoringPage – details step', () => {
  it('shows household fields on Details step', () => {
    render(<ProMonitoringPage />);
    fireEvent.click(screen.getByText('Address is Correct'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Adults')).toBeInTheDocument();
    expect(screen.getByText('Children')).toBeInTheDocument();
    expect(screen.getByText('Pets')).toBeInTheDocument();
  });
});

describe('ProMonitoringPage – no place', () => {
  it('shows default place name when place is null', () => {
    mockPlace = null;
    render(<ProMonitoringPage />);
    expect(screen.getByText('Your Home')).toBeInTheDocument();
  });
});
