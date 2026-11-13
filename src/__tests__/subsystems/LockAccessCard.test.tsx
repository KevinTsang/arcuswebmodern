import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Base, Device, DoorLock, DoorsNLocksSubsystem, Person,
  LockAuthorizationOperation, LockAuthorizationState,
} from '@arcus/core';
import { LockAccessCard } from '@/components/subsystems/LockAccessCard';
import type { LockAuthorizationEntry } from '@/store/entityTypes';
import { makeDevice, makePerson } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

const ALICE = 'SERV:person:alice';
const BOB = 'SERV:person:bob';
const CAROL = 'SERV:person:carol';

const mockPeople = [
  makePerson(ALICE, { [Person.ATTR_FIRSTNAME]: 'Alice', [Person.ATTR_LASTNAME]: 'Johnson' }),
  makePerson(BOB, { [Person.ATTR_FIRSTNAME]: 'Bob', [Person.ATTR_LASTNAME]: 'Smith' }),
  makePerson(CAROL, { [Person.ATTR_FIRSTNAME]: 'Carol', [Person.ATTR_LASTNAME]: 'Davis' }),
];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      people: {
        ids: mockPeople.map((p) => p.id),
        entities: Object.fromEntries(mockPeople.map((p) => [p.id, p])),
      },
    }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/components/subsystems/LockPinHistory', () => ({
  LockPinHistory: ({ lockAddress }: { lockAddress: string }) => <div data-testid={`pin-history-${lockAddress}`} />,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SUB = 'SERV:subdoorsnlocks:place-1';
const LOCK = 'DRIV:dev:lock1';

const lock = makeDevice(LOCK, { [Device.ATTR_NAME]: 'Front Door', [DoorLock.ATTR_NUMPINSSUPPORTED]: 30 });

const defaultEntries: LockAuthorizationEntry[] = [
  { person: BOB, state: LockAuthorizationState.STATE_AUTHORIZED },
  { person: ALICE, state: LockAuthorizationState.STATE_PENDING },
  { person: CAROL, state: LockAuthorizationState.STATE_UNAUTHORIZED },
];

function renderCard(entries = defaultEntries, device = lock) {
  return render(<LockAccessCard lock={device} subsystemAddress={SUB} entries={entries} />);
}

const toggle = (person: string) => screen.getByTestId(`lock-person-toggle-${LOCK}-${person}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('LockAccessCard', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderCard();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the lock name and PIN slot usage', () => {
      renderCard();
      expect(screen.getByText('Front Door')).toBeInTheDocument();
      expect(screen.getByTestId(`lock-access-slots-${LOCK}`)).toHaveTextContent('2 of 30 PINs used');
    });

    it('lists people on the lock before people who can be added', () => {
      renderCard();
      const names = screen.getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'));
      expect(names).toEqual([
        'Alice Johnson can use their PIN on this lock',
        'Bob Smith can use their PIN on this lock',
        'Carol Davis can use their PIN on this lock',
      ]);
      expect(toggle(ALICE)).toBeChecked();
      expect(toggle(BOB)).toBeChecked();
      expect(toggle(CAROL)).not.toBeChecked();
      expect(screen.getByText('Add more people to your access list')).toBeInTheDocument();
    });

    it('shows the PIN history for the lock', () => {
      renderCard();
      expect(screen.getByTestId(`pin-history-${LOCK}`)).toBeInTheDocument();
    });
  });

  describe('authorizing', () => {
    it('adds an unauthorized person to the lock', async () => {
      renderCard();
      fireEvent.click(toggle(CAROL));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        DoorsNLocksSubsystem.CMD_AUTHORIZEPEOPLE,
        SUB,
        {
          device: LOCK,
          operations: [{
            [LockAuthorizationOperation.ATTR_PERSON]: CAROL,
            [LockAuthorizationOperation.ATTR_OPERATION]: LockAuthorizationOperation.OPERATION_AUTHORIZE,
          }],
        },
      ));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('removes an authorized person from the lock', async () => {
      renderCard();
      fireEvent.click(toggle(BOB));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        DoorsNLocksSubsystem.CMD_AUTHORIZEPEOPLE,
        SUB,
        {
          device: LOCK,
          operations: [{
            [LockAuthorizationOperation.ATTR_PERSON]: BOB,
            [LockAuthorizationOperation.ATTR_OPERATION]: LockAuthorizationOperation.OPERATION_DEAUTHORIZE,
          }],
        },
      ));
    });

    it('disables the other checkboxes while a change is in flight', async () => {
      let resolve: (v: object) => void = () => {};
      mockBridgeRequest.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
      renderCard();
      fireEvent.click(toggle(CAROL));
      await waitFor(() => expect(toggle(BOB)).toBeDisabled());
      fireEvent.click(toggle(BOB));
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      resolve({});
      await waitFor(() => expect(toggle(BOB)).toBeEnabled());
    });

    it('shows an error when adding fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      renderCard();
      fireEvent.click(toggle(CAROL));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: "Couldn't add Carol Davis to Front Door" },
      }));
      await waitFor(() => expect(toggle(CAROL)).toBeEnabled());
    });

    it('shows an error when removing fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      renderCard();
      fireEvent.click(toggle(BOB));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: "Couldn't remove Bob Smith from Front Door" },
      }));
    });
  });

  describe('edge cases', () => {
    it('says when no one is on the lock', () => {
      renderCard([{ person: CAROL, state: LockAuthorizationState.STATE_UNAUTHORIZED }]);
      expect(screen.getByTestId(`lock-access-none-${LOCK}`)).toBeInTheDocument();
    });

    it('hides the add-more heading when everyone is on the lock', () => {
      renderCard([{ person: BOB, state: LockAuthorizationState.STATE_AUTHORIZED }]);
      expect(screen.queryByText('Add more people to your access list')).not.toBeInTheDocument();
    });

    it('labels people missing from the store', () => {
      renderCard([{ person: 'SERV:person:ghost', state: LockAuthorizationState.STATE_AUTHORIZED }]);
      expect(screen.getByText('Unknown person')).toBeInTheDocument();
    });

    it('falls back to a generic name and hides slots without lock details', () => {
      renderCard([], makeDevice(LOCK));
      expect(screen.getByText('Lock')).toBeInTheDocument();
      expect(screen.queryByTestId(`lock-access-slots-${LOCK}`)).not.toBeInTheDocument();
    });

    it('uses the lock address from the device', () => {
      renderCard();
      expect(screen.getByTestId(`lock-access-${lock[Base.ATTR_ADDRESS]}`)).toBeInTheDocument();
    });
  });
});
