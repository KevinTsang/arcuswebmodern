import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { RulePanel, parseTemplateString } from '@/components/rules/RulePanel';
import Bridge from '@arcus/core/bridge';
import { Base, Rule, RuleTemplate } from '@arcus/core';
import type { RuleEntity, RuleTemplateEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@/store/hooks', () => {
  const { Base: BaseCapability, RuleTemplate: RuleTemplateCapability } = jest.requireActual('@arcus/core');
  return {
    useAppSelector: (selector: (s: unknown) => unknown) =>
      selector({
        place: { placeId: 'place-1' },
        rules: {
          ruleTemplates: [
            {
              [BaseCapability.ATTR_ADDRESS]: 'SERV:ruletmpl:button-chime',
              [BaseCapability.ATTR_ID]: 'button-chime',
              [RuleTemplateCapability.ATTR_NAME]: 'Chime on Button Press',
              [RuleTemplateCapability.ATTR_TEMPLATE]: 'When ${button} is pressed, play ${chime}',
            },
          ],
        },
      }),
    useAppDispatch: () => mockDispatch,
  };
});

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

const mockTemplate: RuleTemplateEntity = {
  id: 'SERV:ruletmpl:button-chime',
  [Base.ATTR_ADDRESS]: 'SERV:ruletmpl:button-chime',
  [Base.ATTR_ID]: 'button-chime',
  [RuleTemplate.ATTR_NAME]: 'Chime on Button Press',
  [RuleTemplate.ATTR_TEMPLATE]: 'When ${button} is pressed, play ${chime}',
};

const mockRule: RuleEntity = {
  id: 'SERV:rule:place-1.1',
  [Base.ATTR_ADDRESS]: 'SERV:rule:place-1.1',
  [Rule.ATTR_NAME]: 'Door Bell Button',
  [Rule.ATTR_TEMPLATE]: 'button-chime',
  [Rule.ATTR_STATE]: 'ENABLED',
  [Rule.ATTR_CONTEXT]: {
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

// ── Helpers ───────────────────────────────────────────────────────────

const waitForLoad = () =>
  waitFor(() => {
    expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
  });

/** Bridge commands sent so far, in order. */
const bridgeCommands = () => mockBridge.mock.calls.map(([command]) => command);

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
        RuleTemplate.CMD_RESOLVE,
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
        RuleTemplate.CMD_CREATERULE,
        'SERV:ruletmpl:button-chime',
        expect.objectContaining({
          placeId: 'place-1',
          name: 'Chime on Button Press',
          description: 'When Smart Button 1 is pressed, play Ding Dong',
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
        RuleTemplate.CMD_RESOLVE,
        'SERV:ruletmpl:button-chime',
        { placeId: 'place-1' },
      );
    });
  });

  it('saves only the name, then UpdateContext, when no selection changed', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitForLoad();
    fireEvent.change(screen.getByTestId('rule-name-input'), { target: { value: 'Front Door Chime' } });
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(bridgeCommands()).toEqual([RuleTemplate.CMD_RESOLVE, Base.CMD_SETATTRIBUTES, Rule.CMD_UPDATECONTEXT]);
    expect(mockBridge).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, 'SERV:rule:place-1.1', {
      [Rule.ATTR_NAME]: 'Front Door Chime',
    });
    expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_UPDATECONTEXT, 'SERV:rule:place-1.1', {
      context: { button: 'DRIV:dev:btn-1', chime: 'DING_DONG' },
      template: 'button-chime',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { type: 'success', message: 'Rule saved' } }),
    );
  });

  it('saves the regenerated description with the name before UpdateContext when a selection changed', async () => {
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitForLoad();
    fireEvent.click(screen.getByTestId('rule-var-button'));
    fireEvent.click(within(screen.getByTestId('rule-option-DRIV:dev:btn-2')).getByRole('radio'));
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(bridgeCommands()).toEqual([RuleTemplate.CMD_RESOLVE, Base.CMD_SETATTRIBUTES, Rule.CMD_UPDATECONTEXT]);
    expect(mockBridge).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, 'SERV:rule:place-1.1', {
      [Rule.ATTR_NAME]: 'Door Bell Button',
      [Rule.ATTR_DESCRIPTION]: 'When Smart Button 2 is pressed, play Ding Dong',
    });
    expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_UPDATECONTEXT, 'SERV:rule:place-1.1', {
      context: { button: 'DRIV:dev:btn-2', chime: 'DING_DONG' },
      template: 'button-chime',
    });
  });

  it('does not send a blank description when the rule template is not in the catalog', async () => {
    const ruleWithRetiredTemplate: RuleEntity = { ...mockRule, [Rule.ATTR_TEMPLATE]: 'retired-template' };
    render(<RulePanel rule={ruleWithRetiredTemplate} placeId="place-1" />);
    await waitForLoad();
    fireEvent.change(screen.getByTestId('rule-name-input'), { target: { value: 'Front Door Chime' } });
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, 'SERV:rule:place-1.1', {
        [Rule.ATTR_NAME]: 'Front Door Chime',
      });
    });
    expect(mockBridge).not.toHaveBeenCalledWith(
      Base.CMD_SETATTRIBUTES,
      expect.anything(),
      expect.objectContaining({ [Rule.ATTR_DESCRIPTION]: expect.anything() }),
    );
  });

  it('does not write raw addresses into the description when Resolve fails', async () => {
    mockBridge.mockImplementation((command: string) =>
      command === RuleTemplate.CMD_RESOLVE ? Promise.reject(new Error('fail')) : Promise.resolve({}),
    );
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitForLoad();
    fireEvent.change(screen.getByTestId('rule-name-input'), { target: { value: 'Front Door Chime' } });
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, 'SERV:rule:place-1.1', {
        [Rule.ATTR_NAME]: 'Front Door Chime',
      });
    });
    expect(mockBridge).not.toHaveBeenCalledWith(
      Base.CMD_SETATTRIBUTES,
      expect.anything(),
      expect.objectContaining({ [Rule.ATTR_DESCRIPTION]: expect.anything() }),
    );
  });

  it('keeps the saved description when a changed rule still has a selection that is no longer offered', async () => {
    mockBridge.mockResolvedValue({
      selectors: {
        button: { type: 'LIST', options: [['Smart Button 2', 'DRIV:dev:btn-2']] },
        chime: resolvedSelectors.selectors.chime,
      },
    });
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitForLoad();
    fireEvent.click(screen.getByTestId('rule-var-chime'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CHIME' } });
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, 'SERV:rule:place-1.1', {
        [Rule.ATTR_NAME]: 'Door Bell Button',
      });
    });
    expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_UPDATECONTEXT, 'SERV:rule:place-1.1', {
      context: { button: 'DRIV:dev:btn-1', chime: 'CHIME' },
      template: 'button-chime',
    });
  });

  it('shows an error and stays open when UpdateContext fails', async () => {
    mockBridge.mockImplementation((command: string) =>
      command === Rule.CMD_UPDATECONTEXT ? Promise.reject(new Error('fail')) : Promise.resolve(resolvedSelectors),
    );
    render(<RulePanel rule={mockRule} placeId="place-1" />);
    await waitForLoad();
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { type: 'error', message: 'Failed to save rule' } }),
      );
    });
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(screen.getByTestId('rule-save')).toHaveTextContent('Save');
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
      expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_DELETE, 'SERV:rule:place-1.1', {});
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
