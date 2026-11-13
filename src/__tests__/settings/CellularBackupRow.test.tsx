import { render, screen } from '@testing-library/react';
import { Base, CellBackupSubsystem, Place } from '@arcus/core';
import CellularBackupRow from '@/components/settings/CellularBackupRow';
import type { SubsystemEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockSubsystems: { [address: string]: SubsystemEntity } = {};

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ subsystems: { ids: Object.keys(mockSubsystems), entities: mockSubsystems } }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function setCellBackup(attrs: Partial<SubsystemEntity>) {
  const address = 'SERV:cellbackup:place-1';
  mockSubsystems = { [address]: { id: address, [Base.ATTR_ADDRESS]: address, ...attrs } };
}

const value = () => screen.getByTestId('info-value-cellular-backup');

beforeEach(() => {
  jest.clearAllMocks();
  mockSubsystems = {};
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CellularBackupRow', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CellularBackupRow addons={[Place.SERVICEADDON_CELLBACKUP]} isActive={false} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows whether the plan includes the add-on', () => {
    const { rerender } = render(<CellularBackupRow addons={[Place.SERVICEADDON_CELLBACKUP]} isActive={false} />);
    expect(value()).toHaveTextContent('Included in plan');
    rerender(<CellularBackupRow addons={[]} isActive={false} />);
    expect(value()).toHaveTextContent('Not included');
    rerender(<CellularBackupRow addons={undefined} isActive={false} />);
    expect(value()).toHaveTextContent('Not included');
  });

  it("shows the active place's live status", () => {
    setCellBackup({ [CellBackupSubsystem.ATTR_STATUS]: CellBackupSubsystem.STATUS_ACTIVE });
    render(<CellularBackupRow addons={[Place.SERVICEADDON_CELLBACKUP]} isActive />);
    expect(value()).toHaveTextContent('Active (on cellular)');
  });

  it('shows the error reason', () => {
    setCellBackup({
      [CellBackupSubsystem.ATTR_STATUS]: CellBackupSubsystem.STATUS_ERRORED,
      [CellBackupSubsystem.ATTR_ERRORSTATE]: CellBackupSubsystem.ERRORSTATE_NOSIM,
    });
    render(<CellularBackupRow addons={[Place.SERVICEADDON_CELLBACKUP]} isActive />);
    expect(value()).toHaveTextContent('Error (no SIM card)');
  });

  it('ignores the subsystem for a place that is not active', () => {
    setCellBackup({ [CellBackupSubsystem.ATTR_STATUS]: CellBackupSubsystem.STATUS_READY });
    render(<CellularBackupRow addons={[]} isActive={false} />);
    expect(value()).toHaveTextContent('Not included');
  });

  it('falls back to the add-on when the active place has no cellbackup subsystem or status', () => {
    const { rerender } = render(<CellularBackupRow addons={[Place.SERVICEADDON_CELLBACKUP]} isActive />);
    expect(value()).toHaveTextContent('Included in plan');
    setCellBackup({});
    rerender(<CellularBackupRow addons={[]} isActive />);
    expect(value()).toHaveTextContent('Not included');
  });
});
