import { render, screen, fireEvent } from '@testing-library/react';
import { AddPlaceControls } from '@/components/settings/AddPlaceControls';

// ── Helpers ───────────────────────────────────────────────────────────

const mockOnAdd = jest.fn();

const SWITCH_HINT = 'To add a place, first switch to a place you own.';
const NEW_ACCOUNT_HINT = 'To add your own place, create a new account using a different email address.';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AddPlaceControls – rendering', () => {
  it('matches snapshot when enabled', () => {
    const { asFragment } = render(
      <AddPlaceControls access={{ status: 'enabled', accountId: 'acct-own' }} onAdd={mockOnAdd} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it.each([
    ['switch', SWITCH_HINT],
    ['new-account', NEW_ACCOUNT_HINT],
  ] as const)('matches snapshot when disabled with the %s hint', (hint) => {
    const { asFragment } = render(
      <AddPlaceControls access={{ status: 'disabled', hint }} onAdd={mockOnAdd} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows an enabled button and no hint at an owned place', () => {
    render(<AddPlaceControls access={{ status: 'enabled', accountId: 'acct-own' }} onAdd={mockOnAdd} />);
    expect(screen.getByTestId('add-place')).toBeEnabled();
    expect(screen.queryByTestId('add-place-hint')).not.toBeInTheDocument();
  });

  it.each([
    ['switch', SWITCH_HINT],
    ['new-account', NEW_ACCOUNT_HINT],
  ] as const)('shows a disabled button with the %s hint', (hint, text) => {
    render(<AddPlaceControls access={{ status: 'disabled', hint }} onAdd={mockOnAdd} />);
    expect(screen.getByTestId('add-place')).toBeDisabled();
    expect(screen.getByTestId('add-place-hint')).toHaveTextContent(text);
  });

  it('renders nothing while access is unknown', () => {
    const { asFragment } = render(<AddPlaceControls access={{ status: 'hidden' }} onAdd={mockOnAdd} />);
    expect(screen.queryByTestId('add-place-section')).not.toBeInTheDocument();
    expect(asFragment().childNodes).toHaveLength(0);
  });
});

describe('AddPlaceControls – interactions', () => {
  it('calls onAdd with the account when enabled', () => {
    render(<AddPlaceControls access={{ status: 'enabled', accountId: 'acct-own' }} onAdd={mockOnAdd} />);
    fireEvent.click(screen.getByTestId('add-place'));
    expect(mockOnAdd).toHaveBeenCalledWith('acct-own');
  });

  it('does not call onAdd when disabled', () => {
    render(<AddPlaceControls access={{ status: 'disabled', hint: 'switch' }} onAdd={mockOnAdd} />);
    fireEvent.click(screen.getByTestId('add-place'));
    expect(mockOnAdd).not.toHaveBeenCalled();
  });
});
