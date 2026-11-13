import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Person } from '@arcus/core';
import { CallTreeList } from '@/components/subsystems/CallTreeList';
import type { CallTreeEntry } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: { type: string; message: string }) => ({ type: 'ui/addNotification', payload }),
}));

const ALICE = 'SERV:person:alice';
const BOB = 'SERV:person:bob';
const CAROL = 'SERV:person:carol';
const SUB = 'SERV:subcare:place-1';
const ATTR = 'subcare:callTree';

let mockPeople: Record<string, { [key: string]: string }>;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: object) => object) =>
    sel({ people: { ids: Object.keys(mockPeople), entities: mockPeople } }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function person(address: string, first: string) {
  return { [Base.ATTR_ADDRESS]: address, [Person.ATTR_FIRSTNAME]: first, [Person.ATTR_LASTNAME]: '' };
}

const TREE: CallTreeEntry[] = [
  { person: ALICE, enabled: true },
  { person: BOB, enabled: true },
  { person: CAROL, enabled: false },
];

function renderList(props: Partial<React.ComponentProps<typeof CallTreeList>> = {}) {
  return render(
    <CallTreeList
      callTree={TREE}
      subsystemAddress={SUB}
      attribute={ATTR}
      label="care notification list"
      description="People are notified in this order."
      emptyMessage="Nobody yet."
      {...props}
    />,
  );
}

function order() {
  return screen.getAllByTestId(/^calltree-entry-/).map((el) => el.getAttribute('data-testid'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockPeople = { [ALICE]: person(ALICE, 'Alice'), [BOB]: person(BOB, 'Bob'), [CAROL]: person(CAROL, 'Carol') };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CallTreeList', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderList();
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with an owner and a limit', () => {
    const { asFragment } = renderList({ lockedPersonAddress: ALICE, maxEnabled: 6 });
    expect(asFragment()).toMatchSnapshot();
  });

  describe('edits before the store catches up', () => {
    it('builds a second edit on the first, not on the stale list', async () => {
      renderList();

      fireEvent.click(screen.getByTestId(`calltree-move-up-${BOB}`));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledTimes(1));
      // The store hasn't sent the new order yet, but the list already shows it.
      expect(order()).toEqual([`calltree-entry-${BOB}`, `calltree-entry-${ALICE}`, `calltree-entry-${CAROL}`]);

      await waitFor(() => expect(screen.getByTestId(`calltree-toggle-${CAROL}`)).not.toBeDisabled());
      fireEvent.click(screen.getByTestId(`calltree-toggle-${CAROL}`));

      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledTimes(2));
      expect(mockBridgeRequest).toHaveBeenLastCalledWith(expect.any(String), SUB, {
        [ATTR]: [
          { person: BOB, enabled: true },
          { person: ALICE, enabled: true },
          { person: CAROL, enabled: true },
        ],
      });
    });

    it('takes the store list when it changes', () => {
      const { rerender } = renderList();
      const changed: CallTreeEntry[] = [{ person: CAROL, enabled: true }, { person: ALICE, enabled: true }];
      rerender(
        <CallTreeList
          callTree={changed}
          subsystemAddress={SUB}
          attribute={ATTR}
          label="care notification list"
          description="People are notified in this order."
          emptyMessage="Nobody yet."
        />,
      );
      expect(order()).toEqual([`calltree-entry-${CAROL}`, `calltree-entry-${ALICE}`]);
    });

    it('restores the store list and names the list when a save fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('nope'));
      renderList();

      fireEvent.click(screen.getByTestId(`calltree-move-up-${BOB}`));

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to update the care notification list' },
        }),
      );
      expect(order()).toEqual([`calltree-entry-${ALICE}`, `calltree-entry-${BOB}`, `calltree-entry-${CAROL}`]);
    });
  });

  describe('switching everyone off', () => {
    const oneEnabled: CallTreeEntry[] = [{ person: ALICE, enabled: true }, { person: BOB, enabled: false }];

    it('asks before saving a list with no one enabled', () => {
      renderList({ callTree: oneEnabled });
      fireEvent.click(screen.getByTestId(`calltree-toggle-${ALICE}`));

      expect(screen.getByText('No one will be notified')).toBeInTheDocument();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });

    it('saves when confirmed', async () => {
      renderList({ callTree: oneEnabled });
      fireEvent.click(screen.getByTestId(`calltree-toggle-${ALICE}`));
      fireEvent.click(screen.getByRole('button', { name: 'Save Anyway' }));

      await waitFor(() =>
        expect(mockBridgeRequest).toHaveBeenCalledWith(expect.any(String), SUB, {
          [ATTR]: [{ person: ALICE, enabled: false }, { person: BOB, enabled: false }],
        }),
      );
    });

    it('does nothing when cancelled', () => {
      renderList({ callTree: oneEnabled });
      fireEvent.click(screen.getByTestId(`calltree-toggle-${ALICE}`));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockBridgeRequest).not.toHaveBeenCalled();
      expect(screen.queryByText('No one will be notified')).not.toBeInTheDocument();
      expect(screen.getByTestId(`calltree-entry-${ALICE}`)).toHaveAttribute('data-enabled', 'true');
    });

    it('warns when the saved list has no one enabled', () => {
      renderList({ callTree: [{ person: ALICE, enabled: false }] });
      expect(screen.getByTestId('calltree-none-enabled')).toHaveTextContent('No one is set to be notified.');
    });
  });

  describe('names', () => {
    it('shows a loading label until people have loaded', () => {
      mockPeople = {};
      renderList();
      expect(screen.getAllByText('Loading…')).toHaveLength(3);
    });

    it('labels a person who is no longer at the place', () => {
      renderList({ callTree: [{ person: 'SERV:person:gone', enabled: true }] });
      expect(screen.getByRole('button', { name: 'Move Someone no longer at this place up' })).toBeInTheDocument();
    });
  });

  it('uses the border-radius token on rows', () => {
    renderList();
    expect(screen.getByTestId(`calltree-entry-${ALICE}`)).toHaveClass('rounded-[var(--border-radius-base)]');
  });
});
