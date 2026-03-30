import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Base, Person, Place } from '@arcus/core';
import PeoplePlacesSection from '@/components/settings/PeoplePlacesSection';
import type { PlaceData, PersonData } from '@/store/entityTypes';

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

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { placeId: 'place-1' },
      auth: { person: { [Base.ATTR_ADDRESS]: 'SERV:person:p1', personId: 'p1' } },
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
  [Place.ATTR_SERVICELEVEL]: 'PREMIUM',
};

const guestPlaceData: PlaceData = {
  [Base.ATTR_ADDRESS]: 'SERV:place:place-2',
  [Base.ATTR_ID]: 'place-2',
  [Place.ATTR_NAME]: 'Beach House',
  [Place.ATTR_STREETADDRESS1]: '456 Ocean Dr',
  [Place.ATTR_CITY]: 'Malibu',
  [Place.ATTR_STATEPROV]: 'CA',
  [Place.ATTR_ZIPCODE]: '90265',
  [Place.ATTR_SERVICELEVEL]: 'BASIC',
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
