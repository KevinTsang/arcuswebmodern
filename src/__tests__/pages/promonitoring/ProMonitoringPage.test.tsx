import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Place, Person, ProMonitoringSettings } from '@arcus/core';
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

let mockYearly = false;
jest.mock('@/lib/featureFlags', () => ({
  isYearlySubscriptionEnabled: () => mockYearly,
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

// ── Helpers ───────────────────────────────────────────────────────────

const SETTINGS_ADDR = 'SERV:promon:settings-1';

/** Bridge responses by command; anything else resolves to {}. */
function bridgeResponses(overrides: { available?: string; reject?: string[] } = {}) {
  mockBridgeRequest.mockImplementation((cmd: string) => {
    if (overrides.reject?.includes(cmd)) return Promise.reject(new Error('fail'));
    if (cmd === ProMonitoringSettings.CMD_CHECKAVAILABILITY) {
      return Promise.resolve({ available: overrides.available ?? ProMonitoringSettings.AVAILABLE_FULL });
    }
    return Promise.resolve({});
  });
}

/** Render and wait for the availability check to open the wizard. */
async function renderReady() {
  const result = render(<ProMonitoringPage />);
  expect(await screen.findByTestId('promon-step')).toHaveAttribute('data-step', 'address');
  return result;
}

/** Walk from Address to Review. */
async function goToReview() {
  fireEvent.click(screen.getByText('Address is Correct'));
  fireEvent.click(screen.getByText('Next'));
  fireEvent.click(screen.getByText('Next'));
  await screen.findByText('Permit Number (optional)');
  fireEvent.click(screen.getByText('Continue'));
  expect(await screen.findByTestId('promon-pin')).toBeInTheDocument();
}

async function activateWithPin() {
  fireEvent.change(screen.getByTestId('promon-pin'), { target: { value: '1234' } });
  fireEvent.click(screen.getByText('Activate Monitoring'));
  expect(await screen.findByText('Start Test Call')).toBeInTheDocument();
}

function activateCall() {
  return mockBridgeRequest.mock.calls.find(([cmd]) => cmd === ProMonitoringSettings.CMD_ACTIVATE);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockYearly = false;
  bridgeResponses();
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
    settings: { [Base.ATTR_ADDRESS]: SETTINGS_ADDR },
  });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ProMonitoringPage – rendering', () => {
  it('shows Professional Monitoring heading', async () => {
    await renderReady();
    expect(screen.getByText('Professional Monitoring')).toBeInTheDocument();
  });

  it('shows place name', async () => {
    await renderReady();
    expect(screen.getByText('My Home')).toBeInTheDocument();
  });

  it('shows step indicator with 7 steps', async () => {
    await renderReady();
    // Step 1 should show as active
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('starts on Address step', async () => {
    await renderReady();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText(/Verify your home address/)).toBeInTheDocument();
  });

  it('shows the address from place', async () => {
    await renderReady();
    expect(screen.getByText('123 Main St, Springfield, IL, 62701')).toBeInTheDocument();
  });

  it('shows "Address is Correct" button when address exists', async () => {
    await renderReady();
    expect(screen.getByText('Address is Correct')).toBeInTheDocument();
  });

  it('shows "Continue" when no address', async () => {
    mockPlace = { ...mockPlace!, [Place.ATTR_STREETADDRESS1]: undefined, [Place.ATTR_CITY]: undefined, [Place.ATTR_STATEPROV]: undefined, [Place.ATTR_ZIPCODE]: undefined };
    await renderReady();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });
});

describe('ProMonitoringPage – step navigation', () => {
  it('advances to Alarms step', async () => {
    await renderReady();
    fireEvent.click(screen.getByText('Address is Correct'));
    expect(screen.getByText('Alarms')).toBeInTheDocument();
    expect(screen.getByText(/alarm types will be professionally monitored/)).toBeInTheDocument();
  });

  it('shows alarm types on Alarms step', async () => {
    await renderReady();
    fireEvent.click(screen.getByText('Address is Correct'));
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Smoke')).toBeInTheDocument();
    expect(screen.getByText('Carbon Monoxide')).toBeInTheDocument();
    expect(screen.getByText('Panic')).toBeInTheDocument();
  });

  it('advances to Details step', async () => {
    await renderReady();
    fireEvent.click(screen.getByText('Address is Correct'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('shows Back button on Alarms step', async () => {
    await renderReady();
    fireEvent.click(screen.getByText('Address is Correct'));
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('goes back to Address from Alarms', async () => {
    await renderReady();
    fireEvent.click(screen.getByText('Address is Correct'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText(/Verify your home address/)).toBeInTheDocument();
  });
});

describe('ProMonitoringPage – details step', () => {
  it('shows household fields on Details step', async () => {
    await renderReady();
    fireEvent.click(screen.getByText('Address is Correct'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Adults')).toBeInTheDocument();
    expect(screen.getByText('Children')).toBeInTheDocument();
    expect(screen.getByText('Pets')).toBeInTheDocument();
  });
});

describe('ProMonitoringPage – no place', () => {
  it('shows default place name when place is null', async () => {
    mockPlace = null;
    render(<ProMonitoringPage />);
    expect(screen.getByText('Your Home')).toBeInTheDocument();
    expect(screen.getByTestId('promon-checking')).toBeInTheDocument();
    expect(mockGetSettings).not.toHaveBeenCalled();
  });
});

describe('ProMonitoringPage – snapshot', () => {
  it('matches snapshot', async () => {
    const { asFragment } = await renderReady();
    expect(asFragment()).toMatchSnapshot();
  });
});

describe('ProMonitoringPage – availability', () => {
  it('shows a checking message until availability is known', async () => {
    render(<ProMonitoringPage />);
    expect(screen.getByTestId('promon-checking')).toBeInTheDocument();
    expect(await screen.findByTestId('promon-step')).toBeInTheDocument();
    expect(screen.queryByTestId('promon-checking')).not.toBeInTheDocument();
  });

  it('checks availability on the settings object', async () => {
    await renderReady();
    expect(mockGetSettings).toHaveBeenCalledWith('SERV:place:place-1');
    expect(mockBridgeRequest).toHaveBeenCalledWith(ProMonitoringSettings.CMD_CHECKAVAILABILITY, SETTINGS_ADDR, {});
  });

  it('accepts settings that are not wrapped in `settings`', async () => {
    mockGetSettings.mockResolvedValue({ [Base.ATTR_ADDRESS]: SETTINGS_ADDR, [ProMonitoringSettings.ATTR_ADULTS]: 3 });
    await renderReady();
    fireEvent.click(screen.getByText('Address is Correct'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByTestId('promon-adults')).toHaveValue(3);
  });

  it('skips the check for places that are already monitored', async () => {
    mockPlace = { ...mockPlace!, [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM_PROMON };
    await renderReady();
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(ProMonitoringSettings.CMD_CHECKAVAILABILITY, expect.anything(), expect.anything());
  });

  it('skips the check for trial members', async () => {
    mockGetSettings.mockResolvedValue({
      settings: { [Base.ATTR_ADDRESS]: SETTINGS_ADDR, [ProMonitoringSettings.ATTR_TRIAL]: true },
    });
    bridgeResponses({ available: ProMonitoringSettings.AVAILABLE_TRIAL });
    await renderReady();
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(ProMonitoringSettings.CMD_CHECKAVAILABILITY, expect.anything(), expect.anything());
  });

  it('opens the wizard when the settings cannot be loaded', async () => {
    mockGetSettings.mockRejectedValue(new Error('not found'));
    await renderReady();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('says when monitoring is not available at the address', async () => {
    bridgeResponses({ available: ProMonitoringSettings.AVAILABLE_NONE });
    render(<ProMonitoringPage />);
    expect(await screen.findByTestId('promon-unavailable')).toHaveTextContent("isn't available at this address");
    expect(screen.queryByTestId('promon-step')).not.toBeInTheDocument();
  });

  it('treats a missing availability as unavailable', async () => {
    mockBridgeRequest.mockResolvedValue({});
    render(<ProMonitoringPage />);
    expect(await screen.findByTestId('promon-unavailable')).toBeInTheDocument();
  });

  it('notifies and opens the wizard when the check fails', async () => {
    bridgeResponses({ reject: [ProMonitoringSettings.CMD_CHECKAVAILABILITY] });
    await renderReady();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Could not check Professional Monitoring availability.' },
    });
  });
});

describe('ProMonitoringPage – trial', () => {
  beforeEach(() => {
    bridgeResponses({ available: ProMonitoringSettings.AVAILABLE_TRIAL });
  });

  it('asks for a trial code where only the trial group can sign up', async () => {
    render(<ProMonitoringPage />);
    expect(await screen.findByTestId('promon-trial-form')).toBeInTheDocument();
    expect(screen.getByTestId('promon-step')).toHaveAttribute('data-step', 'trial');
    expect(screen.getByText('Professional Monitoring Code')).toBeInTheDocument();
  });

  it('opens the wizard once the trial code is accepted', async () => {
    render(<ProMonitoringPage />);
    fireEvent.change(await screen.findByTestId('promon-trial-code'), { target: { value: 'PROMON-7' } });
    fireEvent.click(screen.getByTestId('promon-trial-submit'));
    await waitFor(() => expect(screen.getByTestId('promon-step')).toHaveAttribute('data-step', 'address'));
    expect(mockBridgeRequest).toHaveBeenCalledWith(ProMonitoringSettings.CMD_JOINTRIAL, SETTINGS_ADDR, { code: 'PROMON-7' });
  });

  it('stays on the trial form when the code is refused', async () => {
    bridgeResponses({ available: ProMonitoringSettings.AVAILABLE_TRIAL, reject: [ProMonitoringSettings.CMD_JOINTRIAL] });
    render(<ProMonitoringPage />);
    fireEvent.change(await screen.findByTestId('promon-trial-code'), { target: { value: 'WRONG' } });
    fireEvent.click(screen.getByTestId('promon-trial-submit'));
    expect(await screen.findByTestId('promon-trial-error')).toBeInTheDocument();
    expect(screen.getByTestId('promon-step')).toHaveAttribute('data-step', 'trial');
  });
});

describe('ProMonitoringPage – plan selection', () => {
  it('hides the plan choice when yearly subscriptions are off', async () => {
    await renderReady();
    await goToReview();
    expect(screen.queryByTestId('promon-plan')).not.toBeInTheDocument();
  });

  it('activates the monthly plan when yearly subscriptions are off', async () => {
    await renderReady();
    await goToReview();
    await activateWithPin();
    expect(activateCall()).toEqual([
      ProMonitoringSettings.CMD_ACTIVATE,
      SETTINGS_ADDR,
      { testCall: true, serviceLevel: Place.SERVICELEVEL_PREMIUM_PROMON },
    ]);
  });

  it('activates monthly even for an annual place when yearly subscriptions are off', async () => {
    mockPlace = { ...mockPlace!, [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM_ANNUAL };
    await renderReady();
    await goToReview();
    await activateWithPin();
    expect(activateCall()?.[2]).toEqual({ testCall: true, serviceLevel: Place.SERVICELEVEL_PREMIUM_PROMON });
  });

  describe('with yearly subscriptions on', () => {
    beforeEach(() => {
      mockYearly = true;
    });

    it('offers monthly and annual billing, monthly first', async () => {
      await renderReady();
      await goToReview();
      expect(screen.getByTestId('promon-plan-monthly')).toBeChecked();
      expect(screen.getByTestId('promon-plan-annual')).not.toBeChecked();
    });

    it('activates the annual plan when chosen', async () => {
      await renderReady();
      await goToReview();
      fireEvent.click(screen.getByTestId('promon-plan-annual'));
      await activateWithPin();
      expect(activateCall()?.[2]).toEqual({ testCall: true, serviceLevel: Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL });
    });

    it('activates the monthly plan when switched back', async () => {
      await renderReady();
      await goToReview();
      fireEvent.click(screen.getByTestId('promon-plan-annual'));
      fireEvent.click(screen.getByTestId('promon-plan-monthly'));
      await activateWithPin();
      expect(activateCall()?.[2]).toEqual({ testCall: true, serviceLevel: Place.SERVICELEVEL_PREMIUM_PROMON });
    });

    it('preselects annual for a place already on an annual plan', async () => {
      mockPlace = { ...mockPlace!, [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM_ANNUAL };
      await renderReady();
      await goToReview();
      expect(screen.getByTestId('promon-plan-annual')).toBeChecked();
    });

    it('keeps the chosen plan and shows an error when activation fails', async () => {
      bridgeResponses({ reject: [ProMonitoringSettings.CMD_ACTIVATE] });
      await renderReady();
      await goToReview();
      fireEvent.click(screen.getByTestId('promon-plan-annual'));
      fireEvent.change(screen.getByTestId('promon-pin'), { target: { value: '1234' } });
      fireEvent.click(screen.getByText('Activate Monitoring'));
      expect(await screen.findByTestId('promon-error')).toHaveTextContent('Invalid PIN or activation failed');
      expect(screen.getByTestId('promon-step')).toHaveAttribute('data-step', 'review');
      expect(screen.getByTestId('promon-plan-annual')).toBeChecked();
    });
  });
});
