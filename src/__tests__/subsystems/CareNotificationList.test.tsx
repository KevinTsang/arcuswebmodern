import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, CareSubsystem, Person } from '@arcus/core';
import { CareNotificationList } from '@/components/subsystems/CareNotificationList';
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

const ALICE = 'SERV:person:person-1';
const BOB = 'SERV:person:person-2';
const CAROL = 'SERV:person:person-3';
const CARE_ADDR = 'SERV:subcare:place-1';

const mockPeople = {
  [ALICE]: { [Base.ATTR_ADDRESS]: ALICE, [Person.ATTR_FIRSTNAME]: 'Alice', [Person.ATTR_LASTNAME]: 'Johnson' },
  [BOB]: { [Base.ATTR_ADDRESS]: BOB, [Person.ATTR_FIRSTNAME]: 'Bob', [Person.ATTR_LASTNAME]: 'Smith' },
  [CAROL]: { [Base.ATTR_ADDRESS]: CAROL, [Person.ATTR_FIRSTNAME]: 'Carol', [Person.ATTR_LASTNAME]: '' },
};

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: object) => object) =>
    sel({ people: { ids: Object.keys(mockPeople), entities: mockPeople } }),
  useAppDispatch: () => mockDispatch,
}));

interface MockCare {
  callTree: CallTreeEntry[];
  subsystem?: { [key: string]: string };
}

const defaultCallTree: CallTreeEntry[] = [
  { person: ALICE, enabled: true },
  { person: BOB, enabled: false },
  { person: CAROL, enabled: true },
];

let mockCare: MockCare;

jest.mock('@/hooks/useCareSubsystem', () => ({
  useCareSubsystem: () => mockCare,
}));

function resetCare(overrides?: Partial<MockCare>) {
  mockCare = {
    callTree: defaultCallTree.map((e) => ({ ...e })),
    subsystem: { [Base.ATTR_ADDRESS]: CARE_ADDR },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  resetCare();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareNotificationList', () => {
  // ── Snapshot ──────────────────────────────────────────────────────

  it('matches snapshot', () => {
    const { asFragment } = render(<CareNotificationList />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot for empty state', () => {
    resetCare({ callTree: [] });
    const { asFragment } = render(<CareNotificationList />);
    expect(asFragment()).toMatchSnapshot();
  });

  // ── Rendering ─────────────────────────────────────────────────────

  it('renders the heading and care-specific description', () => {
    render(<CareNotificationList />);
    expect(screen.getByText('Notification List')).toBeInTheDocument();
    expect(screen.getByText(/when a care alarm is triggered/)).toBeInTheDocument();
  });

  it('renders people in call tree order with positions and enabled state', () => {
    render(<CareNotificationList />);
    expect(screen.getByTestId(`calltree-entry-${ALICE}`)).toHaveAttribute('data-position', '1');
    expect(screen.getByTestId(`calltree-entry-${BOB}`)).toHaveAttribute('data-position', '2');
    expect(screen.getByTestId(`calltree-entry-${CAROL}`)).toHaveAttribute('data-position', '3');
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();

    const switches = screen.getAllByRole('switch');
    expect(switches.map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'false', 'true']);
  });

  it('shows the care empty state when the call tree is empty', () => {
    resetCare({ callTree: [] });
    render(<CareNotificationList />);
    expect(screen.getByText('No contacts configured for care notifications.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('says when a person in the call tree is no longer at the place', () => {
    resetCare({ callTree: [{ person: 'SERV:person:missing', enabled: true }] });
    render(<CareNotificationList />);
    expect(screen.getByText('Someone no longer at this place')).toBeInTheDocument();
  });

  it('does not lock anyone or limit how many people are enabled', () => {
    resetCare({
      callTree: Array.from({ length: 8 }, (_, i) => ({ person: `SERV:person:p${i}`, enabled: i < 7 })),
    });
    render(<CareNotificationList />);
    expect(screen.queryByTestId('calltree-limit')).not.toBeInTheDocument();
    expect(screen.getByTestId('calltree-toggle-SERV:person:p7')).not.toBeDisabled();
  });

  // ── Interactions (success) ────────────────────────────────────────

  it('enables a disabled person by saving subcare:callTree', async () => {
    render(<CareNotificationList />);
    fireEvent.click(screen.getByRole('switch', { name: 'Enable notifications for Bob Smith' }));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, CARE_ADDR, {
        [CareSubsystem.ATTR_CALLTREE]: [
          { person: ALICE, enabled: true },
          { person: BOB, enabled: true },
          { person: CAROL, enabled: true },
        ],
      });
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('disables an enabled person', async () => {
    render(<CareNotificationList />);
    fireEvent.click(screen.getByRole('switch', { name: 'Disable notifications for Alice Johnson' }));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, CARE_ADDR, {
        [CareSubsystem.ATTR_CALLTREE]: [
          { person: ALICE, enabled: false },
          { person: BOB, enabled: false },
          { person: CAROL, enabled: true },
        ],
      });
    });
  });

  it('moves a person up the escalation order', async () => {
    render(<CareNotificationList />);
    fireEvent.click(screen.getByRole('button', { name: 'Move Carol up' }));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, CARE_ADDR, {
        [CareSubsystem.ATTR_CALLTREE]: [
          { person: ALICE, enabled: true },
          { person: CAROL, enabled: true },
          { person: BOB, enabled: false },
        ],
      });
    });
  });

  it('moves a person down the escalation order', async () => {
    render(<CareNotificationList />);
    fireEvent.click(screen.getByRole('button', { name: 'Move Alice Johnson down' }));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, CARE_ADDR, {
        [CareSubsystem.ATTR_CALLTREE]: [
          { person: BOB, enabled: false },
          { person: ALICE, enabled: true },
          { person: CAROL, enabled: true },
        ],
      });
    });
  });

  it('disables the controls while a save is in flight', async () => {
    let resolve: (v: object) => void = () => {};
    mockBridgeRequest.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<CareNotificationList />);

    fireEvent.click(screen.getByRole('switch', { name: 'Enable notifications for Bob Smith' }));
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Disable notifications for Alice Johnson' })).toBeDisabled();
    });

    resolve({});
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Disable notifications for Alice Johnson' })).not.toBeDisabled();
    });
  });

  // ── Interactions (failure) ────────────────────────────────────────

  it('dispatches an error notification when saving fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<CareNotificationList />);
    fireEvent.click(screen.getByRole('switch', { name: 'Enable notifications for Bob Smith' }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update the care notification list' },
      });
    });
    // Controls are usable again after the failure.
    expect(screen.getByRole('switch', { name: 'Enable notifications for Bob Smith' })).not.toBeDisabled();
  });

  it('dispatches an error notification when reordering fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('network'));
    render(<CareNotificationList />);
    fireEvent.click(screen.getByRole('button', { name: 'Move Carol up' }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update the care notification list' },
      });
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it('does not save when the care subsystem is not loaded', async () => {
    resetCare({ subsystem: undefined });
    render(<CareNotificationList />);
    fireEvent.click(screen.getByRole('switch', { name: 'Enable notifications for Bob Smith' }));

    await waitFor(() => {
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  it('disables move up for the first person and move down for the last', () => {
    render(<CareNotificationList />);
    expect(screen.getByRole('button', { name: 'Move Alice Johnson up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Carol down' })).toBeDisabled();
  });

  it('disables both move buttons for a single-person call tree', () => {
    resetCare({ callTree: [{ person: ALICE, enabled: true }] });
    render(<CareNotificationList />);
    expect(screen.getByRole('button', { name: 'Move Alice Johnson up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Alice Johnson down' })).toBeDisabled();
  });
});
