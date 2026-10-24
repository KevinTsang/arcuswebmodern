import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Person, Place } from '@arcus/core';
import PlaceCard from '@/components/settings/PlaceCard';
import type { PlaceWithPeople } from '@/components/settings/types';
import type { PlaceData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight, closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// The ACTIVE place is "Home" (place-home); the card under test is "Lake House".
const activePlace: PlaceData = {
  [Base.ATTR_ADDRESS]: 'SERV:place:place-home',
  [Base.ATTR_ID]: 'place-home',
  [Place.ATTR_NAME]: 'Home',
};

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ place: { placeId: 'place-home', place: activePlace } }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makePlace(overrides: Partial<PlaceWithPeople> = {}): PlaceWithPeople {
  return {
    placeId: 'place-lake',
    name: 'Lake House',
    role: 'OWNER',
    placeData: {
      [Base.ATTR_ADDRESS]: 'SERV:place:place-lake',
      [Base.ATTR_ID]: 'place-lake',
      [Place.ATTR_NAME]: 'Lake House',
      [Place.ATTR_STREETADDRESS1]: '1 Shore Rd',
      [Place.ATTR_CITY]: 'Tahoe',
      [Place.ATTR_SERVICELEVEL]: 'PREMIUM',
    },
    people: [
      {
        [Base.ATTR_ADDRESS]: 'SERV:person:p2',
        [Base.ATTR_ID]: 'p2',
        [Person.ATTR_FIRSTNAME]: 'Jane',
        [Person.ATTR_LASTNAME]: 'Smith',
        [Person.ATTR_EMAIL]: 'jane@test.com',
      },
    ],
    ...overrides,
  };
}

const defaultProps = {
  place: makePlace(),
  isOwner: true,
  isActive: false,
  currentPersonId: 'p1',
  onRefresh: jest.fn(),
};

/** Render whatever the card pushed into the side panel. */
function renderOpenedPanel() {
  expect(mockOpenRight).toHaveBeenCalledTimes(1);
  return render(mockOpenRight.mock.calls[0][0] as ReactElement);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockImplementation((type: string) =>
    type === Place.CMD_CREATEINVITATION
      ? Promise.resolve({ invitation: { code: 'abc', inviteeEmail: 'robin@test.com' } })
      : Promise.resolve({}),
  );
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PlaceCard – rendering', () => {
  it('matches snapshot', () => {
    const { container } = render(<PlaceCard {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows the place name, people and owner actions', () => {
    render(<PlaceCard {...defaultProps} />);
    expect(screen.getByText('Lake House')).toBeInTheDocument();
    expect(screen.getByTestId('person-place-lake-p2')).toHaveTextContent('Jane Smith');
    expect(screen.getByTestId('place-invite-place-lake')).toBeInTheDocument();
    expect(screen.getByTestId('manage-api-keys-place-lake')).toBeInTheDocument();
    expect(screen.getByTestId('place-edit-place-lake')).toBeInTheDocument();
  });

  it('marks only the active card as active', () => {
    const { rerender } = render(<PlaceCard {...defaultProps} />);
    expect(screen.getByTestId('place-card-place-lake')).toHaveAttribute('data-active', 'false');
    expect(screen.queryByTestId('place-active-place-lake')).not.toBeInTheDocument();

    rerender(<PlaceCard {...defaultProps} isActive />);
    expect(screen.getByTestId('place-card-place-lake')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('place-active-place-lake')).toBeInTheDocument();
  });
});

describe('PlaceCard – API keys link', () => {
  it("links to this card's place, not the active place", () => {
    render(<PlaceCard {...defaultProps} />);
    expect(screen.getByTestId('manage-api-keys-place-lake')).toHaveAttribute(
      'href',
      '/settings/api-keys?placeId=place-lake',
    );
  });

  it('is hidden when the place attributes failed to load', () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ placeData: null })} />);
    expect(screen.queryByTestId('manage-api-keys-place-lake')).not.toBeInTheDocument();
  });
});

describe('PlaceCard – invite', () => {
  it("opens the invite panel for this card's place", () => {
    render(<PlaceCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('place-invite-place-lake'));

    renderOpenedPanel();
    expect(screen.getByTestId('invite-panel-place')).toHaveTextContent('Send an invitation to join Lake House.');
  });

  it('sends the invitation to the non-active card place (not the active place)', async () => {
    render(<PlaceCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('place-invite-place-lake'));
    renderOpenedPanel();

    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'robin@test.com' } });
    fireEvent.click(screen.getByTestId('invite-send'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Place.CMD_CREATEINVITATION,
        'SERV:place:place-lake',
        expect.objectContaining({ email: 'robin@test.com' }),
      );
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Place.CMD_SENDINVITATION,
        'SERV:place:place-lake',
        { invitation: { code: 'abc', inviteeEmail: 'robin@test.com' } },
      );
    });
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(
      expect.anything(),
      activePlace[Base.ATTR_ADDRESS],
      expect.anything(),
    );
  });

  it('refreshes the places list after the invitation is sent', async () => {
    render(<PlaceCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('place-invite-place-lake'));
    renderOpenedPanel();

    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'robin@test.com' } });
    fireEvent.click(screen.getByTestId('invite-send'));

    await waitFor(() => expect(defaultProps.onRefresh).toHaveBeenCalled());
  });

  it('reports a failed invitation without refreshing', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<PlaceCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('place-invite-place-lake'));
    renderOpenedPanel();

    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'robin@test.com' } });
    fireEvent.click(screen.getByTestId('invite-send'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to send invitation.' },
      }),
    );
    expect(defaultProps.onRefresh).not.toHaveBeenCalled();
  });

  it('names an unnamed place as "Unnamed Place" in the invite panel', () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ name: '' })} />);
    fireEvent.click(screen.getByTestId('place-invite-place-lake'));

    renderOpenedPanel();
    expect(screen.getByTestId('invite-panel-place')).toHaveTextContent('Send an invitation to join Unnamed Place.');
  });
});

describe('PlaceCard – guest places', () => {
  it('offers no invite, API key or edit actions to non-owners', () => {
    render(<PlaceCard {...defaultProps} isOwner={false} place={makePlace({ role: 'FULL_ACCESS' })} />);
    expect(screen.queryByTestId('place-invite-place-lake')).not.toBeInTheDocument();
    expect(screen.queryByTestId('manage-api-keys-place-lake')).not.toBeInTheDocument();
    expect(screen.queryByTestId('place-edit-place-lake')).not.toBeInTheDocument();
  });
});
