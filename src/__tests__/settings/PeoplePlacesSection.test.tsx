import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Base, Person, Place } from '@arcus/core';
import PeoplePlacesSection from '@/components/settings/PeoplePlacesSection';
import { AddPlacePanel } from '@/components/settings/AddPlacePanel';
import type { PlaceData, PersonData } from '@/store/entityTypes';
import type { SessionPlace } from '@/arcus/types';

const mockOpenRight = jest.fn();
const mockBridgeRequest = jest.fn();
const mockListAvailablePlaces = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@arcus/core/services', () => ({
  SessionService: {
    ListAvailablePlaces: (...args: any[]) => mockListAvailablePlaces(...args),
  },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight, closeRight: jest.fn() }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/slices/placeSlice', () => ({
  setPlace: (payload: unknown) => ({ type: 'place/setPlace', payload }),
}));

jest.mock('@/components/settings/AddPlacePanel', () => ({
  AddPlacePanel: () => null,
}));

// Session places from SessionCreated: the user owns place-1 (their own
// account) and is a guest at place-2 (someone else's account).
const ownSessionPlace: SessionPlace = { placeId: 'place-1', placeName: 'My Home', accountId: 'acct-own', role: 'OWNER' };
const guestSessionPlace: SessionPlace = { placeId: 'place-2', placeName: 'Beach House', accountId: 'acct-other', role: 'FULL_ACCESS' };

let mockActivePlaceId = 'place-1';
let mockActivePlace: PlaceData | null = null;
let mockSessionPlaces: SessionPlace[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { placeId: mockActivePlaceId, place: mockActivePlace },
      auth: {
        person: { [Base.ATTR_ADDRESS]: 'SERV:person:p1', personId: 'p1', places: mockSessionPlaces },
        // The active place's account — must not be used as the AddPlace target.
        account: { [Base.ATTR_ADDRESS]: 'SERV:account:acct-other' },
      },
    }),
  useAppDispatch: () => jest.fn(),
}));

const ownerPlace = {
  placeId: 'place-1',
  name: 'My Home',
  role: 'OWNER',
};

const guestPlace = {
  placeId: 'place-2',
  name: 'Beach House',
  role: 'FULL_ACCESS',
};

const ownerPlaceData: PlaceData = {
  [Base.ATTR_ADDRESS]: 'SERV:place:place-1',
  [Base.ATTR_ID]: 'place-1',
  [Place.ATTR_NAME]: 'My Home',
  [Place.ATTR_STREETADDRESS1]: '123 Main St',
  [Place.ATTR_CITY]: 'Springfield',
  [Place.ATTR_STATEPROV]: 'IL',
  [Place.ATTR_ZIPCODE]: '62701',
  [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM,
  [Place.ATTR_ACCOUNT]: 'acct-own',
};

const guestPlaceData: PlaceData = {
  [Base.ATTR_ADDRESS]: 'SERV:place:place-2',
  [Base.ATTR_ID]: 'place-2',
  [Place.ATTR_NAME]: 'Beach House',
  [Place.ATTR_STREETADDRESS1]: '456 Ocean Dr',
  [Place.ATTR_CITY]: 'Malibu',
  [Place.ATTR_STATEPROV]: 'CA',
  [Place.ATTR_ZIPCODE]: '90265',
  [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_BASIC,
  [Place.ATTR_ACCOUNT]: 'acct-other',
};

const person1: PersonData = {
  [Base.ATTR_ADDRESS]: 'SERV:person:p1',
  [Base.ATTR_ID]: 'p1',
  [Person.ATTR_FIRSTNAME]: 'Me',
  [Person.ATTR_LASTNAME]: 'User',
  [Person.ATTR_EMAIL]: 'me@test.com',
};

const person2: PersonData = {
  [Base.ATTR_ADDRESS]: 'SERV:person:p2',
  [Person.ATTR_FIRSTNAME]: 'Jane',
  [Person.ATTR_LASTNAME]: 'Smith',
  [Person.ATTR_EMAIL]: 'jane@test.com',
};

const person3: PersonData = {
  [Base.ATTR_ADDRESS]: 'SERV:person:p3',
  [Person.ATTR_FIRSTNAME]: 'Bob',
  [Person.ATTR_LASTNAME]: 'Jones',
  [Person.ATTR_EMAIL]: 'bob@test.com',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockActivePlaceId = 'place-1';
  mockActivePlace = ownerPlaceData;
  mockSessionPlaces = [ownSessionPlace, guestSessionPlace];

  mockListAvailablePlaces.mockResolvedValue({
    places: [ownerPlace, guestPlace],
  });

  mockBridgeRequest.mockImplementation((type: string, addr: string) => {
    if (type === Base.CMD_GETATTRIBUTES) {
      if (addr === 'SERV:place:place-1') return Promise.resolve(ownerPlaceData);
      if (addr === 'SERV:place:place-2') return Promise.resolve(guestPlaceData);
    }
    if (type === Place.CMD_LISTPERSONS) {
      if (addr === 'SERV:place:place-1') {
        return Promise.resolve({ persons: [person1, person2] });
      }
      if (addr === 'SERV:place:place-2') {
        return Promise.resolve({ persons: [person1, person3] });
      }
    }
    return Promise.resolve({});
  });
});

describe('PeoplePlacesSection – loading', () => {
  it('shows loading state', () => {
    mockListAvailablePlaces.mockReturnValue(new Promise(() => {}));
    render(<PeoplePlacesSection />);
    expect(screen.getByText('Loading places…')).toBeInTheDocument();
  });
});

describe('PeoplePlacesSection – displays all places', () => {
  it('shows owner and guest place sections', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Your Places')).toBeInTheDocument();
      expect(screen.getByText('Guest At')).toBeInTheDocument();
    });
  });

  it('shows owner place with details', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('My Home')).toBeInTheDocument();
      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByText('Owner')).toBeInTheDocument();
    });
  });

  it('shows guest place with details', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Beach House')).toBeInTheDocument();
      expect(screen.getByText(/456 Ocean Dr/)).toBeInTheDocument();
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Full Access')).toBeInTheDocument();
    });
  });

  it('marks active place', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Active Place')).toBeInTheDocument();
    });
  });
});

describe('PeoplePlacesSection – people subsection', () => {
  it('shows other people at owner place (filters out current user)', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    });
  });

  it('shows other people at guest place', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });
  });

  it('does not show current user in people list', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    // "Me User" should not appear as they are the current user
    expect(screen.queryByText('Me User')).not.toBeInTheDocument();
  });
});

describe('PeoplePlacesSection – actions', () => {
  it('shows Edit button on owner places', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('shows Invite button on owner places', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('+ Invite')).toBeInTheDocument();
    });
  });

  it('shows Add Place button', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('+ Add Place')).toBeInTheDocument();
    });
  });

  it('opens side panel on Edit click', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit'));
    expect(mockOpenRight).toHaveBeenCalled();
  });

  it('shows Details on people at owner places', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    const detailsButtons = screen.getAllByText('Details');
    expect(detailsButtons.length).toBeGreaterThan(0);
  });

  it('shows API Keys link on owner places', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Manage API Keys')).toBeInTheDocument();
    });
  });
});

describe('PeoplePlacesSection – empty state', () => {
  it('shows no places message when none available', async () => {
    mockListAvailablePlaces.mockResolvedValue({ places: [] });
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('No places found.')).toBeInTheDocument();
    });
  });
});

describe('PeoplePlacesSection – only owner places', () => {
  it('does not show Guest At section when no guest places', async () => {
    mockListAvailablePlaces.mockResolvedValue({ places: [ownerPlace] });
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('My Home')).toBeInTheDocument();
    });
    expect(screen.queryByText('Guest At')).not.toBeInTheDocument();
  });
});

describe('PeoplePlacesSection – only guest places', () => {
  it('does not show Your Places section when no owner places', async () => {
    mockListAvailablePlaces.mockResolvedValue({ places: [guestPlace] });
    render(<PeoplePlacesSection />);
    await waitFor(() => {
      expect(screen.getByText('Beach House')).toBeInTheDocument();
    });
    expect(screen.queryByText('Your Places')).not.toBeInTheDocument();
  });
});

describe('PeoplePlacesSection – add place', () => {
  // A place the user added (or joined) after signing in: it isn't in the
  // SessionCreated snapshot, only in the fetched places list.
  const cabinPlace = { placeId: 'place-3', name: 'Cabin', role: 'OWNER' };
  const cabinPlaceData: PlaceData = {
    [Base.ATTR_ADDRESS]: 'SERV:place:place-3',
    [Base.ATTR_ID]: 'place-3',
    [Place.ATTR_NAME]: 'Cabin',
    [Place.ATTR_ACCOUNT]: 'acct-own',
  };

  function openedPanel() {
    return mockOpenRight.mock.calls[0][0] as ReactElement<{ accountId: string; onSaved: () => void }>;
  }

  it('matches snapshot at a place the user owns', async () => {
    render(<PeoplePlacesSection />);
    expect(await screen.findByTestId('add-place-section')).toMatchSnapshot();
  });

  it('matches snapshot while a guest place is active', async () => {
    mockActivePlaceId = 'place-2';
    mockActivePlace = guestPlaceData;
    render(<PeoplePlacesSection />);
    expect(await screen.findByTestId('add-place-section')).toMatchSnapshot();
  });

  it('enables Add Place when the active place is one the user owns', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByTestId('add-place')).toBeInTheDocument());
    expect(screen.getByTestId('add-place')).not.toBeDisabled();
    expect(screen.queryByTestId('add-place-hint')).not.toBeInTheDocument();
  });

  it("opens AddPlacePanel for the active place's account", async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByTestId('add-place')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('add-place'));

    const panel = openedPanel();
    expect(panel.type).toBe(AddPlacePanel);
    // place:account of the active place, not s.auth.account (acct-other)
    expect(panel.props.accountId).toBe('acct-own');
    expect(panel.props.onSaved).toEqual(expect.any(Function));
  });

  it.each([
    ['fails to load', () => mockListAvailablePlaces.mockRejectedValue(new Error('timeout'))],
    ['is empty', () => mockListAvailablePlaces.mockResolvedValue({ places: [] })],
  ])('keeps Add Place enabled at an owned place when the places list %s', async (_, setUp) => {
    setUp();
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByText('No places found.')).toBeInTheDocument());

    expect(screen.getByTestId('add-place')).not.toBeDisabled();
    expect(screen.queryByTestId('add-place-hint')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('add-place'));
    expect(openedPanel().props.accountId).toBe('acct-own');
  });

  it('enables Add Place at an owned place added since sign-in', async () => {
    mockActivePlaceId = 'place-3';
    mockActivePlace = cabinPlaceData;
    mockListAvailablePlaces.mockResolvedValue({ places: [ownerPlace, guestPlace, cabinPlace] });
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByTestId('add-place')).toBeInTheDocument());

    expect(screen.getByTestId('add-place')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('add-place'));
    expect(openedPanel().props.accountId).toBe('acct-own');
  });

  it("shows no Add Place or hint when the active place's role is unknown", async () => {
    mockActivePlaceId = 'place-3';
    mockActivePlace = cabinPlaceData;
    mockListAvailablePlaces.mockRejectedValue(new Error('timeout'));
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByText('No places found.')).toBeInTheDocument());

    expect(screen.queryByTestId('add-place')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-place-hint')).not.toBeInTheDocument();
  });

  it.each([
    ['has not loaded', null],
    ['is still the previous place', guestPlaceData],
  ])("hides Add Place while the active place's record %s", async (_, record) => {
    mockActivePlace = record;
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByText('My Home')).toBeInTheDocument());

    expect(screen.queryByTestId('add-place')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-place-hint')).not.toBeInTheDocument();
  });

  it('reloads the places list when a place is added, keeping the current list on screen', async () => {
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByTestId('add-place')).toBeInTheDocument());
    expect(mockListAvailablePlaces).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('add-place'));
    let resolveList!: (value: { places: typeof ownerPlace[] }) => void;
    mockListAvailablePlaces.mockReturnValue(new Promise((resolve) => {
      resolveList = resolve;
    }));
    act(() => openedPanel().props.onSaved());

    // While the reload runs, the existing places stay visible
    expect(mockListAvailablePlaces).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Loading places…')).not.toBeInTheDocument();
    expect(screen.getByTestId('place-card-place-1')).toBeInTheDocument();

    await act(async () => resolveList({ places: [ownerPlace, guestPlace, cabinPlace] }));
    await waitFor(() => expect(screen.getByTestId('place-card-place-3')).toBeInTheDocument());
  });

  it('disables Add Place with a hint while a guest place is active', async () => {
    mockActivePlaceId = 'place-2';
    mockActivePlace = guestPlaceData;
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByTestId('add-place')).toBeInTheDocument());

    expect(screen.getByTestId('add-place')).toBeDisabled();
    expect(screen.getByTestId('add-place-hint')).toHaveTextContent('To add a place, first switch to a place you own.');
    fireEvent.click(screen.getByTestId('add-place'));
    expect(mockOpenRight).not.toHaveBeenCalled();
  });

  it('hides Add Place when the user owns no account', async () => {
    mockActivePlaceId = 'place-2';
    mockActivePlace = guestPlaceData;
    mockSessionPlaces = [guestSessionPlace];
    mockListAvailablePlaces.mockResolvedValue({ places: [guestPlace] });
    render(<PeoplePlacesSection />);
    await waitFor(() => expect(screen.getByText('Beach House')).toBeInTheDocument());

    expect(screen.queryByTestId('add-place')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-place-hint')).not.toBeInTheDocument();
  });
});
