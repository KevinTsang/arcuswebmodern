import { Fragment, type ReactElement } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, CellBackupSubsystem, Person, Place } from '@arcus/core';
import PlaceCard from '@/components/settings/PlaceCard';
import type { PlaceWithPeople } from '@/components/settings/types';
import type { PlaceData, SubsystemEntity } from '@/store/entityTypes';
import type { Invitation } from '@arcus/core/services/types';

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

// Subsystems loaded for the active place (the cellbackup subsystem, in some tests).
let mockSubsystems: { [address: string]: SubsystemEntity } = {};

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { placeId: 'place-home', place: activePlace },
      subsystems: { ids: Object.keys(mockSubsystems), entities: mockSubsystems },
    }),
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
      [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM,
    },
    people: [
      {
        person: {
          [Base.ATTR_ADDRESS]: 'SERV:person:p2',
          [Base.ATTR_ID]: 'p2',
          [Person.ATTR_FIRSTNAME]: 'Jane',
          [Person.ATTR_LASTNAME]: 'Smith',
          [Person.ATTR_EMAIL]: 'jane@test.com',
        },
        role: 'FULL_ACCESS',
      },
    ],
    invitations: [],
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

/**
 * The element most recently pushed into the side panel, keyed by the key it
 * was opened with, as SidePanelFrame does, so a new key remounts it.
 */
function lastOpenedPanel(): ReactElement {
  const [content, options] = mockOpenRight.mock.calls[mockOpenRight.mock.calls.length - 1];
  return <Fragment key={options.key}>{content}</Fragment>;
}

/** An owned "Home" card shown next to the Lake House card. */
const homePlace = makePlace({
  placeId: 'place-home',
  name: 'Home',
  placeData: activePlace,
  people: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSubsystems = {};
  mockBridgeRequest.mockImplementation((type: string) =>
    type === Place.CMD_CREATEINVITATION
      ? Promise.resolve({ invitation: { code: 'abc', inviteeEmail: 'robin@test.com' } })
      : Promise.resolve({}),
  );
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PlaceCard – rendering', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PlaceCard {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
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
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), {
      title: 'Invite a Person',
      key: 'add-person:place-lake',
    });
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

describe('PlaceCard – invite from more than one card', () => {
  function renderBothCards() {
    render(
      <>
        <PlaceCard {...defaultProps} />
        <PlaceCard {...defaultProps} place={homePlace} isActive />
      </>,
    );
  }

  it("opens a fresh form for another card's place", () => {
    renderBothCards();
    fireEvent.click(screen.getByTestId('place-invite-place-lake'));
    // The side panel renders each opened element in the same slot.
    const panel = render(lastOpenedPanel());
    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'jane@x.com' } });

    fireEvent.click(screen.getByTestId('place-invite-place-home'));
    panel.rerender(lastOpenedPanel());

    expect(screen.getByTestId('invite-panel-place')).toHaveTextContent('Send an invitation to join Home.');
    expect(screen.getByPlaceholderText('person@example.com')).toHaveValue('');
    expect(screen.getByTestId('invite-send')).toBeDisabled();
  });

  it("does not close or toast over the new card's panel when the earlier send finishes", async () => {
    let finishSend: () => void = () => {};
    mockBridgeRequest.mockImplementation((type: string) =>
      type === Place.CMD_CREATEINVITATION
        ? Promise.resolve({ invitation: { code: 'abc', inviteeEmail: 'jane@x.com' } })
        : new Promise<void>((resolve) => { finishSend = resolve; }),
    );
    renderBothCards();
    fireEvent.click(screen.getByTestId('place-invite-place-lake'));
    const panel = render(lastOpenedPanel());
    fireEvent.change(screen.getByPlaceholderText('person@example.com'), { target: { value: 'jane@x.com' } });
    fireEvent.click(screen.getByTestId('invite-send'));
    await waitFor(() =>
      expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_SENDINVITATION, 'SERV:place:place-lake', expect.anything()),
    );

    fireEvent.click(screen.getByTestId('place-invite-place-home'));
    panel.rerender(lastOpenedPanel());
    await act(async () => finishSend());

    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(screen.getByTestId('invite-panel-place')).toHaveTextContent('Send an invitation to join Home.');
    expect(screen.getByTestId('invite-send')).toHaveTextContent('Send Invitation');
    // The invitation did go out, so the places list still refreshes.
    expect(defaultProps.onRefresh).toHaveBeenCalled();
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

// ── Roles ─────────────────────────────────────────────────────────────

const ownerPerson = {
  person: {
    [Base.ATTR_ADDRESS]: 'SERV:person:p9',
    [Base.ATTR_ID]: 'p9',
    [Person.ATTR_FIRSTNAME]: 'Olive',
    [Person.ATTR_LASTNAME]: 'Owner',
  },
  role: 'OWNER',
};

const hobbit = {
  person: {
    [Base.ATTR_ADDRESS]: 'SERV:person:p3',
    [Base.ATTR_ID]: 'p3',
    [Person.ATTR_FIRSTNAME]: 'Kid',
  },
  role: 'HOBBIT',
};

describe('PlaceCard – roles', () => {
  it("labels each person with their role at the place", () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ people: [...makePlace().people, hobbit] })} />);
    expect(screen.getByTestId('person-place-lake-p2')).toHaveTextContent('Full Access');
    expect(screen.getByTestId('person-place-lake-p3')).toHaveTextContent('Partial Access');
  });

  it("labels the account owner and offers no Details for them", () => {
    render(<PlaceCard {...defaultProps} isOwner={false} place={makePlace({ role: 'FULL_ACCESS', people: [ownerPerson] })} />);
    expect(screen.getByTestId('person-place-lake-p9')).toHaveTextContent('Account Owner');
    expect(screen.queryByTestId('person-place-lake-p9-details')).not.toBeInTheDocument();
  });

  it('offers Details for partial-access people and passes their role to the panel', () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ people: [hobbit] })} />);
    fireEvent.click(screen.getByTestId('person-place-lake-p3-details'));
    renderOpenedPanel();
    expect(screen.getByTestId('info-value-access')).toHaveTextContent('Partial Access');
  });

  it('shows no role badge when the role is unknown', () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ people: [{ ...hobbit, role: '' }] })} />);
    expect(screen.getByTestId('person-place-lake-p3')).toHaveTextContent('Kid');
    expect(screen.getByTestId('person-place-lake-p3')).not.toHaveTextContent('Partial Access');
  });
});

// ── Pending invitations ──────────────────────────────────────────────

const invitation: Invitation = {
  code: 'INV-1',
  placeId: 'place-lake',
  placeName: 'Lake House',
  inviteeEmail: 'robin@test.com',
  inviteeFirstName: 'Robin',
  inviteeLastName: 'Park',
  invitorFirstName: 'Me',
  invitorLastName: 'User',
};

describe('PlaceCard – pending invitations', () => {
  it('lists pending invitations with a Cancel action for owners', () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ invitations: [invitation] })} />);
    expect(screen.getByTestId('invitation-place-lake-INV-1')).toHaveTextContent('Robin Park');
    expect(screen.getByTestId('invitation-place-lake-INV-1')).toHaveTextContent('Invitation Sent');
    expect(screen.getByTestId('invitation-place-lake-INV-1-cancel')).toBeInTheDocument();
  });

  it('lists an invitation even when nobody else is at the place yet', () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ people: [], invitations: [invitation] })} />);
    expect(screen.queryByTestId('place-no-people-place-lake')).not.toBeInTheDocument();
    expect(screen.getByTestId('invitation-place-lake-INV-1')).toBeInTheDocument();
  });

  it('offers no Cancel to non-owners', () => {
    render(<PlaceCard {...defaultProps} isOwner={false} place={makePlace({ role: 'FULL_ACCESS', invitations: [invitation] })} />);
    expect(screen.queryByTestId('invitation-place-lake-INV-1-cancel')).not.toBeInTheDocument();
  });

  it("cancels the invitation on this card's place and refreshes", async () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ invitations: [invitation] })} />);
    fireEvent.click(screen.getByTestId('invitation-place-lake-INV-1-cancel'));
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), {
      title: 'Cancel Invitation',
      key: 'cancel-invitation:place-lake:INV-1',
    });
    renderOpenedPanel();
    fireEvent.click(screen.getByTestId('cancel-invitation-confirm'));

    await waitFor(() => expect(defaultProps.onRefresh).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_CANCELINVITATION, 'SERV:place:place-lake', { code: 'INV-1' });
  });
});

// ── Cellular backup ──────────────────────────────────────────────────

describe('PlaceCard – cellular backup', () => {
  const cellBackup = (attrs: Partial<SubsystemEntity>): SubsystemEntity => ({
    id: 'SERV:cellbackup:place-home',
    [Base.ATTR_ADDRESS]: 'SERV:cellbackup:place-home',
    ...attrs,
  });

  it('says the add-on is not included when the plan has no add-ons', () => {
    render(<PlaceCard {...defaultProps} />);
    expect(screen.getByTestId('place-info-place-lake-value-cellular-backup')).toHaveTextContent('Not included');
  });

  it('says the add-on is included when place:serviceAddons lists it', () => {
    const place = makePlace();
    render(
      <PlaceCard
        {...defaultProps}
        place={{ ...place, placeData: { ...place.placeData!, [Place.ATTR_SERVICEADDONS]: [Place.SERVICEADDON_CELLBACKUP] } }}
      />,
    );
    expect(screen.getByTestId('place-info-place-lake-value-cellular-backup')).toHaveTextContent('Included in plan');
  });

  it("shows the active place's live cellular backup status", () => {
    mockSubsystems = {
      'SERV:cellbackup:place-home': cellBackup({
        [CellBackupSubsystem.ATTR_STATUS]: CellBackupSubsystem.STATUS_NOTREADY,
        [CellBackupSubsystem.ATTR_NOTREADYSTATE]: CellBackupSubsystem.NOTREADYSTATE_NEEDSMODEM,
      }),
    };
    render(<PlaceCard {...defaultProps} place={homePlace} isActive />);
    expect(screen.getByTestId('place-info-place-home-value-cellular-backup')).toHaveTextContent('Not ready (no 4G modem)');
  });

  it("doesn't show the active place's status on another place's card", () => {
    mockSubsystems = {
      'SERV:cellbackup:place-home': cellBackup({ [CellBackupSubsystem.ATTR_STATUS]: CellBackupSubsystem.STATUS_ACTIVE }),
    };
    render(<PlaceCard {...defaultProps} />);
    expect(screen.getByTestId('place-info-place-lake-value-cellular-backup')).toHaveTextContent('Not included');
  });

  it('is hidden when the place attributes failed to load', () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ placeData: null })} />);
    expect(screen.queryByTestId('place-info-place-lake-value-cellular-backup')).not.toBeInTheDocument();
  });
});

// ── Remove place ─────────────────────────────────────────────────────

describe('PlaceCard – remove place', () => {
  it('offers Remove Place on an owned, non-primary, non-active place', () => {
    render(<PlaceCard {...defaultProps} />);
    expect(screen.getByTestId('place-remove-place-lake')).toHaveTextContent('Remove Place');
  });

  it('explains why the primary place cannot be removed', () => {
    render(<PlaceCard {...defaultProps} place={makePlace({ primary: true })} />);
    expect(screen.queryByTestId('place-remove-place-lake')).not.toBeInTheDocument();
    expect(screen.getByTestId('place-remove-hint-place-lake')).toHaveTextContent('primary place');
  });

  it('asks to switch away before removing the active place', () => {
    render(<PlaceCard {...defaultProps} isActive />);
    expect(screen.queryByTestId('place-remove-place-lake')).not.toBeInTheDocument();
    expect(screen.getByTestId('place-remove-hint-place-lake')).toHaveTextContent('Switch to another place');
  });

  it('is not offered to guests or when the place failed to load', () => {
    const { rerender } = render(<PlaceCard {...defaultProps} isOwner={false} place={makePlace({ role: 'FULL_ACCESS' })} />);
    expect(screen.queryByTestId('place-remove-place-lake')).not.toBeInTheDocument();
    expect(screen.queryByTestId('place-remove-hint-place-lake')).not.toBeInTheDocument();
    rerender(<PlaceCard {...defaultProps} place={makePlace({ placeData: null })} />);
    expect(screen.queryByTestId('place-remove-place-lake')).not.toBeInTheDocument();
  });

  it("deletes this card's place and refreshes", async () => {
    render(<PlaceCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('place-remove-place-lake'));
    expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), {
      title: 'Remove Place',
      key: 'remove-place:place-lake',
    });
    renderOpenedPanel();
    fireEvent.change(screen.getByTestId('field-confirm'), { target: { value: 'remove' } });
    fireEvent.click(screen.getByTestId('remove-place-submit'));
    fireEvent.click(screen.getByTestId('remove-place-delete'));

    await waitFor(() => expect(defaultProps.onRefresh).toHaveBeenCalled());
    expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_DELETE, 'SERV:place:place-lake', {});
  });
});
