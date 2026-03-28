import { render, screen, fireEvent } from '@testing-library/react';
import { RulesLibrary } from '@/components/rules/RulesLibrary';

const mockOpenRight = jest.fn();

jest.mock('@/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

// Mock Accordion to just render children
jest.mock('@/components/shared/Accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div data-testid="accordion">{children}</div>,
  AccordionPanel: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="accordion-panel">
      <span data-testid="panel-title">{title}</span>
      {children}
    </div>
  ),
}));

// Mock RulePanel to avoid its dependencies
jest.mock('@/components/rules/RulePanel', () => ({
  RulePanel: () => <div data-testid="rule-panel" />,
}));

import { useAppSelector } from '@/store/hooks';
const mockUseAppSelector = useAppSelector as jest.Mock;

const templates = [
  {
    'base:address': 'SERV:ruletmpl:t1',
    'base:id': 't1',
    'ruletmpl:name': 'Chime on Button Press',
    'ruletmpl:description': 'Play a chime when button pressed',
    'ruletmpl:categories': ['Sounds & Alerts', 'Button Actions'],
  },
  {
    'base:address': 'SERV:ruletmpl:t2',
    'base:id': 't2',
    'ruletmpl:name': 'Lock Door at Night',
    'ruletmpl:categories': ['Security'],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RulesLibrary', () => {
  it('shows empty state when no templates', () => {
    mockUseAppSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ rules: { ruleTemplates: [] } }),
    );
    render(<RulesLibrary placeId="place-1" />);
    expect(screen.getByText('No rule templates available.')).toBeInTheDocument();
  });

  it('groups templates by category', () => {
    mockUseAppSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ rules: { ruleTemplates: templates } }),
    );
    render(<RulesLibrary placeId="place-1" />);
    const titles = screen.getAllByTestId('panel-title');
    const titleTexts = titles.map((t) => t.textContent);
    expect(titleTexts).toContain('Button Actions (1)');
    expect(titleTexts).toContain('Security (1)');
    expect(titleTexts).toContain('Sounds & Alerts (1)');
  });

  it('renders template names', () => {
    mockUseAppSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ rules: { ruleTemplates: templates } }),
    );
    render(<RulesLibrary placeId="place-1" />);
    // Template appears in multiple categories, so use getAllByText
    expect(screen.getAllByText('Chime on Button Press').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lock Door at Night')).toBeInTheDocument();
  });

  it('renders template descriptions', () => {
    mockUseAppSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ rules: { ruleTemplates: templates } }),
    );
    render(<RulesLibrary placeId="place-1" />);
    expect(screen.getAllByText('Play a chime when button pressed').length).toBeGreaterThanOrEqual(1);
  });

  it('calls openRight when template clicked', () => {
    mockUseAppSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ rules: { ruleTemplates: templates } }),
    );
    render(<RulesLibrary placeId="place-1" />);
    fireEvent.click(screen.getByText('Lock Door at Night'));
    expect(mockOpenRight).toHaveBeenCalled();
  });
});
