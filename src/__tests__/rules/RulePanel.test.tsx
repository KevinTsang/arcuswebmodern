import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RulePanel, parseTemplateString } from '@/components/rules/RulePanel';
import Bridge from '@arcus/core/bridge';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      place: { placeId: 'place-1' },
      rules: {
        ruleTemplates: [
          {
            'base:address': 'SERV:ruletmpl:button-chime',
            'base:id': 'button-chime',
            'ruletmpl:name': 'Chime on Button Press',
            'ruletmpl:template': 'When ${button} is pressed, play ${chime}',
          },
        ],
      },
    }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

const mockBridge = Bridge.request as jest.Mock;

const mockTemplate: Record<string, unknown> = {
  'base:address': 'SERV:ruletmpl:button-chime',
  'base:id': 'button-chime',
  'ruletmpl:name': 'Chime on Button Press',
  'ruletmpl:template': 'When ${button} is pressed, play ${chime}',
};

const mockRule: Record<string, unknown> = {
  'base:address': 'SERV:rule:place-1.1',
  'rule:name': 'Door Bell Button',
  'rule:template': 'button-chime',
  'rule:state': 'ENABLED',
  'rule:context': {
    button: 'DRIV:dev:btn-1',
    chime: 'DING_DONG',
    _accountId: 'acct-1',
    _placeId: 'place-1',
  },
};

// Server returns options as tuples: [label, value]
const resolvedSelectors = {
  selectors: {
    button: {
      type: 'LIST',
      options: [
        ['Smart Button 1', 'DRIV:dev:btn-1'],
        ['Smart Button 2', 'DRIV:dev:btn-2'],
      ],
    },
    chime: {
      type: 'LIST',
      options: [
        ['Ding Dong', 'DING_DONG'],
        ['Chime', 'CHIME'],
      ],
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBridge.mockResolvedValue(resolvedSelectors);
});

// ── parseTemplateString ───────────────────────────────────────────────

describe('parseTemplateString', () => {
  it('parses template with variables', () => {
    const segments = parseTemplateString('When ${button} is pressed');
    expect(segments).toEqual([
      { type: 'text', text: 'When ' },
      { type: 'variable', text: 'button', name: 'button' },
      { type: 'text', text: ' is pressed' },
    ]);
  });

  it('handles multiple variables', () => {
    const segments = parseTemplateString('${a} and ${b}');
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ type: 'variable', text: 'a', name: 'a' });
    expect(segments[2]).toEqual({ type: 'variable', text: 'b', name: 'b' });
  });

  it('handles plain text with no variables', () => {
    const segments = parseTemplateString('no variables here');
    expect(segments).toEqual([{ type: 'text', text: 'no variables here' }]);
  });

  it('handles empty string', () => {
    expect(parseTemplateString('')).toEqual([]);
  });
});

// ── Create Mode ───────────────────────────────────────────────────────

describe('RulePanel (create mode)', () => {
  it('shows loading state initially', () => {
    mockBridge.mockReturnValue(new Promise(() => {}));
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    expect(screen.getByText('Loading template...')).toBeInTheDocument();
    expect(screen.getByText('Create Rule')).toBeInTheDocument();
  });

  it('renders template variables as buttons after loading', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('button')).toBeInTheDocument();
    expect(screen.getByText('chime')).toBeInTheDocument();
  });

  it('calls ruletmpl:Resolve with template address', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        'ruletmpl:Resolve',
        'SERV:ruletmpl:button-chime',
        { placeId: 'place-1' },
      );
    });
  });

  it('pre-populates name from template', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Chime on Button Press')).toBeInTheDocument();
  });

  it('shows instruction text when no variable selected', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Click a word or phrase above to edit.')).toBeInTheDocument();
  });

  it('shows device radio list when device variable clicked', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('button'));
    expect(screen.getByText('Choose Device')).toBeInTheDocument();
    expect(screen.getByText('Smart Button 1')).toBeInTheDocument();
    expect(screen.getByText('Smart Button 2')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('shows select dropdown for generic variable', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('chime'));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Select an option...')).toBeInTheDocument();
  });

  it('selects device via radio and updates variable display', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('button'));
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[0]);
    // Template button should now show selected name
    expect(screen.getByRole('button', { name: 'Smart Button 1' })).toBeInTheDocument();
    // Radio list should still be visible
    expect(screen.getByText('Smart Button 2')).toBeInTheDocument();
  });

  it('calls ruletmpl:CreateRule on save when all filled', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    // Select device via radio
    fireEvent.click(screen.getByText('button'));
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[0]);
    // Select chime via dropdown
    fireEvent.click(screen.getByRole('button', { name: 'chime' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DING_DONG' } });
    // Save
    fireEvent.click(screen.getByRole('button', { name: 'Create Rule' }));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        'ruletmpl:CreateRule',
        'SERV:ruletmpl:button-chime',
        expect.objectContaining({
          placeId: 'place-1',
          name: 'Chime on Button Press',
          context: { button: 'DRIV:dev:btn-1', chime: 'DING_DONG' },
        }),
      );
    });
  });

  it('disables save when not all variables filled', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Create Rule' })).toBeDisabled();
  });

  it('calls closeRight on cancel', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('does not show delete button', async () => {
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Delete Rule')).not.toBeInTheDocument();
  });

  it('dispatches error on resolve failure', async () => {
    mockBridge.mockRejectedValue(new Error('fail'));
    render(<RulePanel template={mockTemplate} placeId="place-1" />);
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error', message: 'Failed to resolve rule template' }),
        }),
      );
    });
  });
});

// ── Edit Mode ─────────────────────────────────────────────────────────

describe('RulePanel (edit mode)', () => {
  it('shows Edit Rule heading', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Edit Rule')).toBeInTheDocument();
  });

  it('pre-populates name from rule', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Door Bell Button')).toBeInTheDocument();
  });

  it('pre-populates context showing selected option names in template buttons', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Smart Button 1' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Ding Dong' })).toBeInTheDocument();
  });

  it('resolves template from rule:template id', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        'ruletmpl:Resolve',
        'SERV:ruletmpl:button-chime',
        { placeId: 'place-1' },
      );
    });
  });

  it('saves name via SetAttributes and context via UpdateContext', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        'base:SetAttributes',
        'SERV:rule:place-1.1',
        { 'rule:name': 'Door Bell Button' },
      );
      expect(mockBridge).toHaveBeenCalledWith(
        'rule:UpdateContext',
        'SERV:rule:place-1.1',
        expect.objectContaining({
          context: expect.objectContaining({ button: 'DRIV:dev:btn-1', chime: 'DING_DONG' }),
          template: 'button-chime',
        }),
      );
    });
  });

  it('shows delete button', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Delete Rule')).toBeInTheDocument();
  });

  it('shows confirmation on delete click', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Delete Rule'));
    expect(screen.getByText('Are you sure you want to delete this rule?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
  });

  it('deletes rule on confirm', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Delete Rule'));
    fireEvent.click(screen.getByText('Yes, Delete'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith('rule:Delete', 'SERV:rule:place-1.1', {});
    });
  });

  it('cancels delete confirmation', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Delete Rule'));
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.getByText('Delete Rule')).toBeInTheDocument();
  });

  it('allows changing a variable selection via radio', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitFor(() => {
      expect(screen.getByText('Smart Button 1')).toBeInTheDocument();
    });
    // Click the currently selected button variable to open subsection
    fireEvent.click(screen.getByRole('button', { name: 'Smart Button 1' }));
    expect(screen.getByText('Choose Device')).toBeInTheDocument();
    // Select a different device via radio
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]);
    // Template button should update
    expect(screen.getByRole('button', { name: 'Smart Button 2' })).toBeInTheDocument();
  });
});
