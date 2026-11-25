import { render, screen } from '@testing-library/react';
import { Base, Device, LockAuthorizationState } from '@arcus/core';
import { LockAccessList } from '@/components/subsystems/LockAccessList';
import type { DeviceEntity, LockAuthorizationEntry, LockAuthorizationMap, SubsystemEntity } from '@/store/entityTypes';
import { makeDevice, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

interface MockDoorsLocks {
  subsystem?: SubsystemEntity;
  locks: DeviceEntity[];
  authorizationByLock: LockAuthorizationMap;
}

let mockDoorsLocks: MockDoorsLocks;

jest.mock('@/hooks/useDoorsLocksSubsystem', () => ({
  useDoorsLocksSubsystem: () => mockDoorsLocks,
}));

jest.mock('@/components/subsystems/LockAccessCard', () => ({
  LockAccessCard: ({ lock, subsystemAddress, entries }: {
    lock: DeviceEntity; subsystemAddress: string; entries: LockAuthorizationEntry[];
  }) => (
    <div data-testid="lock-card" data-sub={subsystemAddress} data-entries={entries.length}>
      {lock[Device.ATTR_NAME] as string}
    </div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SUB = 'SERV:subdoorsnlocks:place-1';
const BACK = makeDevice('DRIV:dev:back', { [Device.ATTR_NAME]: 'Back Door' });
const FRONT = makeDevice('DRIV:dev:front', { [Device.ATTR_NAME]: 'Front Door' });

beforeEach(() => {
  jest.clearAllMocks();
  mockDoorsLocks = {
    subsystem: makeSubsystem(SUB),
    locks: [FRONT, BACK],
    authorizationByLock: {
      [FRONT[Base.ATTR_ADDRESS]]: [
        { person: 'SERV:person:a', state: LockAuthorizationState.STATE_AUTHORIZED },
        { person: 'SERV:person:b', state: LockAuthorizationState.STATE_UNAUTHORIZED },
      ],
    },
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('LockAccessList', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<LockAccessList />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders one card per lock, sorted by name', () => {
    render(<LockAccessList />);
    const cards = screen.getAllByTestId('lock-card');
    expect(cards.map((c) => c.textContent)).toEqual(['Back Door', 'Front Door']);
    expect(cards[0]).toHaveAttribute('data-sub', SUB);
  });

  it('passes each lock its own authorizations, empty when none', () => {
    render(<LockAccessList />);
    const [back, front] = screen.getAllByTestId('lock-card');
    expect(back).toHaveAttribute('data-entries', '0');
    expect(front).toHaveAttribute('data-entries', '2');
  });

  it('points to Settings for adding people', () => {
    render(<LockAccessList />);
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('shows an empty state without locks', () => {
    mockDoorsLocks.locks = [];
    render(<LockAccessList />);
    expect(screen.getByTestId('lock-access-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('lock-card')).not.toBeInTheDocument();
  });

  it('shows an empty state before the subsystem loads', () => {
    mockDoorsLocks.subsystem = undefined;
    render(<LockAccessList />);
    expect(screen.getByTestId('lock-access-empty')).toBeInTheDocument();
  });
});
