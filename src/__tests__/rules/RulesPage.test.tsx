import { render, screen, fireEvent } from '@testing-library/react';
import RulesPage from '@/app/(authenticated)/rules/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/components/rules/RulePanel', () => ({
  RulePanel: () => <div>RulePanel</div>,
}));

jest.mock('@/components/rules/RuleListItem', () => ({
  RuleListItem: ({ rule, onEdit }: any) => (
    <div data-testid="rule-item">
      <span>{rule['rule:name']}</span>
      <button onClick={() => onEdit(rule)}>Edit</button>
    </div>
  ),
}));

jest.mock('@/components/rules/RulesLibrary', () => ({
  RulesLibrary: ({ placeId }: any) => <div data-testid="rules-library">Library for {placeId}</div>,
}));

let mockRules: Record<string, unknown>[] = [];
let mockPlaceId: string | null = 'place-1';
let mockPlaceName: string = 'Your Home';

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      rules: {
        entities: Object.fromEntries(mockRules.map((r, i) => [`r${i}`, { ...r, id: `r${i}` }])),
        ids: mockRules.map((_, i) => `r${i}`),
      },
      place: {
        placeId: mockPlaceId,
        place: { 'place:name': mockPlaceName },
      },
    }),
}));

jest.mock('@/store/slices/rulesSlice', () => ({
  selectAllRules: (state: any) => state.rules.ids.map((id: string) => state.rules.entities[id]),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRules = [];
  mockPlaceId = 'place-1';
  mockPlaceName = 'Your Home';
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('RulesPage – rendering', () => {
  it('shows Rules heading', () => {
    render(<RulesPage />);
    expect(screen.getByText('Rules')).toBeInTheDocument();
  });

  it('shows place name', () => {
    mockPlaceName = 'Office';
    render(<RulesPage />);
    expect(screen.getByText('Office')).toBeInTheDocument();
  });

  it('shows My Rules and Rules Library tabs', () => {
    render(<RulesPage />);
    expect(screen.getByText('My Rules')).toBeInTheDocument();
    expect(screen.getByText('Rules Library')).toBeInTheDocument();
  });

  it('shows empty state when no rules', () => {
    render(<RulesPage />);
    expect(screen.getByText('No rules configured yet.')).toBeInTheDocument();
  });
});

describe('RulesPage – with rules', () => {
  beforeEach(() => {
    mockRules = [
      { 'rule:name': 'Lock at Night', 'base:address': 'SERV:rule:r1' },
      { 'rule:name': 'Lights On at Sunset', 'base:address': 'SERV:rule:r2' },
    ];
  });

  it('renders rule names', () => {
    render(<RulesPage />);
    expect(screen.getByText('Lock at Night')).toBeInTheDocument();
    expect(screen.getByText('Lights On at Sunset')).toBeInTheDocument();
  });

  it('does not show empty state', () => {
    render(<RulesPage />);
    expect(screen.queryByText('No rules configured yet.')).not.toBeInTheDocument();
  });

  it('opens side panel on edit', () => {
    render(<RulesPage />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(mockOpenRight).toHaveBeenCalled();
  });
});

describe('RulesPage – view toggle', () => {
  it('shows My Rules view by default', () => {
    render(<RulesPage />);
    // Empty state for My Rules is shown, not the library
    expect(screen.getByText('No rules configured yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('rules-library')).not.toBeInTheDocument();
  });

  it('switches to Rules Library view', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Rules Library'));
    expect(screen.getByTestId('rules-library')).toBeInTheDocument();
    expect(screen.queryByText('No rules configured yet.')).not.toBeInTheDocument();
  });

  it('passes placeId to RulesLibrary', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Rules Library'));
    expect(screen.getByText('Library for place-1')).toBeInTheDocument();
  });

  it('switches back to My Rules view', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Rules Library'));
    fireEvent.click(screen.getByText('My Rules'));
    expect(screen.queryByTestId('rules-library')).not.toBeInTheDocument();
  });
});
