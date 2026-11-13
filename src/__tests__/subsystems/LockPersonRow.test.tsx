import { render, screen, fireEvent } from '@testing-library/react';
import { LockAuthorizationState } from '@arcus/core';
import { LockPersonRow } from '@/components/subsystems/LockPersonRow';
import type { LockAuthorizationEntry } from '@/store/entityTypes';

// ── Helpers ───────────────────────────────────────────────────────────

const LOCK = 'DRIV:dev:lock1';
const PERSON = 'SERV:person:p1';
const mockOnToggle = jest.fn();

function renderRow(state: LockAuthorizationEntry['state'], disabled = false) {
  const entry: LockAuthorizationEntry = { person: PERSON, state };
  return render(
    <LockPersonRow lockAddress={LOCK} entry={entry} name="Alice Johnson" disabled={disabled} onToggle={mockOnToggle} />,
  );
}

const toggle = () => screen.getByTestId(`lock-person-toggle-${LOCK}-${PERSON}`);

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('LockPersonRow', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderRow(LockAuthorizationState.STATE_AUTHORIZED);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the name and a ticked checkbox for an authorized person', () => {
    renderRow(LockAuthorizationState.STATE_AUTHORIZED);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(toggle()).toBeChecked();
    expect(toggle()).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Alice Johnson can use their PIN on this lock' })).toBeInTheDocument();
  });

  it('shows an unticked checkbox for an unauthorized person', () => {
    renderRow(LockAuthorizationState.STATE_UNAUTHORIZED);
    expect(toggle()).not.toBeChecked();
  });

  it('calls onToggle with the entry when clicked', () => {
    renderRow(LockAuthorizationState.STATE_UNAUTHORIZED);
    fireEvent.click(toggle());
    expect(mockOnToggle).toHaveBeenCalledWith({ person: PERSON, state: LockAuthorizationState.STATE_UNAUTHORIZED });
  });

  it('disables a pending person and explains why', () => {
    renderRow(LockAuthorizationState.STATE_PENDING);
    expect(toggle()).toBeChecked();
    expect(toggle()).toBeDisabled();
    expect(screen.getByText(/updating PINs/)).toBeInTheDocument();
  });

  it('disables the checkbox when the row is disabled', () => {
    renderRow(LockAuthorizationState.STATE_AUTHORIZED, true);
    expect(toggle()).toBeDisabled();
  });
});
