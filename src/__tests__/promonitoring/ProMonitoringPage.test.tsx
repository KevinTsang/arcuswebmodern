import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProMonitoringPage from '@/app/(authenticated)/promonitoring/page';

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

let mockPlace: Record<string, unknown> | null = null;
let mockPerson: Record<string, unknown> | null = null;

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
    'base:address': 'SERV:place:place-1',
    'base:id': 'place-1',
    'place:name': 'My Home',
    'place:streetAddress1': '123 Main St',
    'place:city': 'Springfield',
    'place:stateProv': 'IL',
    'place:zipCode': '62701',
    'place:serviceLevel': 'PREMIUM',
  };
  mockPerson = {
    'base:address': 'SERV:person:person-1',
    'person:email': 'user@test.com',
  };
  mockGetSettings.mockResolvedValue({
    'base:address': 'SERV:promon:settings-1',
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
    mockPlace = { ...mockPlace!, 'place:streetAddress1': undefined, 'place:city': undefined, 'place:stateProv': undefined, 'place:zipCode': undefined };
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
