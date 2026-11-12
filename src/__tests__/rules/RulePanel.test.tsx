import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { RulePanel, parseTemplateString } from '@/components/rules/RulePanel';
import { findRuleTemplate, resolveRuleSelectors } from '@/components/rules/resolveRuleSelectors';
import { renderSuspended } from '../helpers/renderSuspended';
import Bridge from '@arcus/core/bridge';
import { Base, Rule, RuleTemplate } from '@arcus/core';
import type { RuleEntity, RuleTemplateEntity } from '@/store/entityTypes';
import { makeRule } from '../helpers/factories';

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

const RULE_ADDRESS = 'SERV:rule:place-1.1';

const mockRule = makeRule(RULE_ADDRESS, {
  [Rule.ATTR_NAME]: 'Door Bell Button',
  [Rule.ATTR_DESCRIPTION]: 'When Smart Button 1 is pressed, play Ding Dong',
  [Rule.ATTR_TEMPLATE]: 'button-chime',
  [Rule.ATTR_STATE]: Rule.STATE_ENABLED,
  [Rule.ATTR_CONTEXT]: {
    button: 'DRIV:dev:btn-1',
    chime: 'DING_DONG',
    _accountId: 'acct-1',
    _placeId: 'place-1',
    _ruleName: 'Door Bell Button',
  },
});

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

/**
 * Render the panel the way useOpenRulePanel opens it: resolving the template's selectors
 * through the Bridge mock first, and waiting for them.
 */
function renderPanel({ rule, template }: { rule?: RuleEntity; template?: RuleTemplateEntity }) {
  const templateAddress = findRuleTemplate(rule, template, [mockTemplate])?.[Base.ATTR_ADDRESS];
  const selectors = resolveRuleSelectors(templateAddress, 'place-1', mockDispatch);
  return renderSuspended(<RulePanel rule={rule} template={template} placeId="place-1" selectors={selectors} />);
}

/** Bridge commands sent so far, in order. */
const bridgeCommands = () => mockBridge.mock.calls.map(([command]) => command);

/** Fails one Bridge command; Resolve answers with the default selectors. */
const failCommand = (failing: string) =>
  mockBridge.mockImplementation((command: string) =>
    command === failing ? Promise.reject(new Error('fail')) : Promise.resolve(resolvedSelectors),
  );

const renameRule = (name: string) =>
  fireEvent.change(screen.getByTestId('rule-name-input'), { target: { value: name } });

const pickButton = (address: string) => {
  fireEvent.click(screen.getByTestId('rule-var-button'));
  fireEvent.click(within(screen.getByTestId(`rule-option-${address}`)).getByRole('radio'));
};

const pickChime = (value: string) => {
  fireEvent.click(screen.getByTestId('rule-var-chime'));
  fireEvent.change(screen.getByTestId('rule-option-select'), { target: { value } });
};

const expectNoDescriptionSent = () =>
  expect(mockBridge).not.toHaveBeenCalledWith(
    Base.CMD_SETATTRIBUTES,
    expect.anything(),
    expect.objectContaining({ [Rule.ATTR_DESCRIPTION]: expect.anything() }),
  );

const successToast = { payload: { type: 'success', message: 'Rule saved' } };

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

// ── findRuleTemplate ──────────────────────────────────────────────────

describe('findRuleTemplate', () => {
  it('prefers the template it is given', () => {
    expect(findRuleTemplate(mockRule, mockTemplate, [])).toBe(mockTemplate);
  });

  it("finds the catalog entry for the rule's template id", () => {
    expect(findRuleTemplate(mockRule, undefined, [mockTemplate])).toBe(mockTemplate);
  });

  it('finds nothing when the template is not in the catalog', () => {
    const retired = makeRule(RULE_ADDRESS, { ...mockRule, [Rule.ATTR_TEMPLATE]: 'retired-template' });
    expect(findRuleTemplate(retired, undefined, [mockTemplate])).toBeUndefined();
  });

  it('finds nothing without a rule or template', () => {
    expect(findRuleTemplate(undefined, undefined, [mockTemplate])).toBeUndefined();
  });
});

// ── resolveRuleSelectors ──────────────────────────────────────────────

describe('resolveRuleSelectors', () => {
  it('parses option tuples into named options', async () => {
    await expect(resolveRuleSelectors('SERV:ruletmpl:button-chime', 'place-1', mockDispatch)).resolves.toEqual({
      button: {
        type: 'LIST',
        name: 'button',
        options: [
          { name: 'Smart Button 1', value: 'DRIV:dev:btn-1' },
          { name: 'Smart Button 2', value: 'DRIV:dev:btn-2' },
        ],
      },
      chime: {
        type: 'LIST',
        name: 'chime',
        options: [
          { name: 'Ding Dong', value: 'DING_DONG' },
          { name: 'Chime', value: 'CHIME' },
        ],
      },
    });
  });

  it('accepts selectors at the top level of the response', async () => {
    mockBridge.mockResolvedValueOnce({ chime: { type: 'LIST', options: [['Chime', 'CHIME']] }, other: 'ignored' });
    await expect(resolveRuleSelectors('SERV:ruletmpl:button-chime', 'place-1', mockDispatch)).resolves.toEqual({
      chime: { type: 'LIST', name: 'chime', options: [{ name: 'Chime', value: 'CHIME' }] },
    });
  });

  it('resolves to no selectors, without calling the platform, when there is no template', async () => {
    await expect(resolveRuleSelectors(undefined, 'place-1', mockDispatch)).resolves.toEqual({});
    expect(mockBridge).not.toHaveBeenCalled();
  });

  it('resolves to no selectors and notifies when Resolve fails', async () => {
    mockBridge.mockRejectedValueOnce(new Error('fail'));
    await expect(resolveRuleSelectors('SERV:ruletmpl:button-chime', 'place-1', mockDispatch)).resolves.toEqual({});
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { type: 'error', message: 'Failed to resolve rule template' } }),
    );
  });
});

// ── Create Mode ───────────────────────────────────────────────────────

describe('RulePanel (create mode)', () => {
  it('matches snapshot', async () => {
    const { asFragment } = await renderPanel({ template: mockTemplate });
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the fallback until the selectors resolve', async () => {
    await renderSuspended(<RulePanel template={mockTemplate} placeId="place-1" selectors={new Promise(() => {})} />);
    expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('rule-name-input')).not.toBeInTheDocument();
  });

  it('renders template variables as buttons after loading', async () => {
    await renderPanel({ template: mockTemplate });
    expect(screen.getByText('button')).toBeInTheDocument();
    expect(screen.getByText('chime')).toBeInTheDocument();
  });

  it('calls ruletmpl:Resolve with template address', async () => {
    await renderPanel({ template: mockTemplate });
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        RuleTemplate.CMD_RESOLVE,
        'SERV:ruletmpl:button-chime',
        { placeId: 'place-1' },
      );
    });
  });

  it('pre-populates name from template', async () => {
    await renderPanel({ template: mockTemplate });
    expect(screen.getByDisplayValue('Chime on Button Press')).toBeInTheDocument();
  });

  it('shows instruction text when no variable selected', async () => {
    await renderPanel({ template: mockTemplate });
    expect(screen.getByText('Click a word or phrase above to edit.')).toBeInTheDocument();
  });

  it('shows device radio list when device variable clicked', async () => {
    await renderPanel({ template: mockTemplate });
    fireEvent.click(screen.getByText('button'));
    expect(screen.getByText('Choose Device')).toBeInTheDocument();
    expect(screen.getByText('Smart Button 1')).toBeInTheDocument();
    expect(screen.getByText('Smart Button 2')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('shows select dropdown for generic variable', async () => {
    await renderPanel({ template: mockTemplate });
    fireEvent.click(screen.getByText('chime'));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Select an option...')).toBeInTheDocument();
  });

  it('selects device via radio and updates variable display', async () => {
    await renderPanel({ template: mockTemplate });
    fireEvent.click(screen.getByText('button'));
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[0]);
    // Template button should now show selected name
    expect(screen.getByRole('button', { name: 'Smart Button 1' })).toBeInTheDocument();
    // Radio list should still be visible
    expect(screen.getByText('Smart Button 2')).toBeInTheDocument();
  });

  it('calls ruletmpl:CreateRule on save when all filled', async () => {
    await renderPanel({ template: mockTemplate });
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

  it('leaves the description to the platform when a template variable has no option to pick', async () => {
    const timedTemplate: RuleTemplateEntity = {
      ...mockTemplate,
      [RuleTemplate.ATTR_TEMPLATE]: 'When ${button} is pressed at ${time}',
    };
    mockBridge.mockResolvedValue({ selectors: { button: resolvedSelectors.selectors.button } });
    await renderPanel({ template: timedTemplate });
    pickButton('DRIV:dev:btn-1');
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    // Exact match: no description key, rather than 'When Smart Button 1 is pressed at time'
    expect(mockBridge).toHaveBeenCalledWith(RuleTemplate.CMD_CREATERULE, 'SERV:ruletmpl:button-chime', {
      placeId: 'place-1',
      name: 'Chime on Button Press',
      context: { button: 'DRIV:dev:btn-1' },
    });
  });

  it('disables save when not all variables filled', async () => {
    await renderPanel({ template: mockTemplate });
    expect(screen.getByRole('button', { name: 'Create Rule' })).toBeDisabled();
  });

  it('calls closeRight on cancel', async () => {
    await renderPanel({ template: mockTemplate });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCloseRight).toHaveBeenCalled();
  });

  it('does not show delete button', async () => {
    await renderPanel({ template: mockTemplate });
    expect(screen.queryByText('Delete Rule')).not.toBeInTheDocument();
  });

  it('dispatches error on resolve failure', async () => {
    mockBridge.mockRejectedValue(new Error('fail'));
    await renderPanel({ template: mockTemplate });
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
  it('pre-populates name from rule', async () => {
    await renderPanel({ rule: mockRule });
    expect(screen.getByDisplayValue('Door Bell Button')).toBeInTheDocument();
  });

  it('pre-populates context showing selected option names in template buttons', async () => {
    await renderPanel({ rule: mockRule });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Smart Button 1' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Ding Dong' })).toBeInTheDocument();
  });

  it('resolves the template found from rule:template', async () => {
    await renderPanel({ rule: mockRule });
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(
        RuleTemplate.CMD_RESOLVE,
        'SERV:ruletmpl:button-chime',
        { placeId: 'place-1' },
      );
    });
  });

  it('matches snapshot', async () => {
    const { asFragment } = await renderPanel({ rule: mockRule });
    expect(asFragment()).toMatchSnapshot();
  });

  it('saves the name, then re-applies the context, on a rename', async () => {
    await renderPanel({ rule: mockRule });
    renameRule('Front Door Chime');
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(bridgeCommands()).toEqual([RuleTemplate.CMD_RESOLVE, Base.CMD_SETATTRIBUTES, Rule.CMD_UPDATECONTEXT]);
    expect(mockBridge).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, RULE_ADDRESS, {
      [Rule.ATTR_NAME]: 'Front Door Chime',
    });
    expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_UPDATECONTEXT, RULE_ADDRESS, {
      context: { button: 'DRIV:dev:btn-1', chime: 'DING_DONG' },
      template: 'button-chime',
    });
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining(successToast));
  });

  it('sends nothing when Save is clicked without changes', async () => {
    await renderPanel({ rule: mockRule });
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(bridgeCommands()).toEqual([RuleTemplate.CMD_RESOLVE]);
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining(successToast));
  });

  it('writes the new description only after UpdateContext applies a changed selection', async () => {
    await renderPanel({ rule: mockRule });
    pickButton('DRIV:dev:btn-2');
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(bridgeCommands()).toEqual([RuleTemplate.CMD_RESOLVE, Rule.CMD_UPDATECONTEXT, Base.CMD_SETATTRIBUTES]);
    expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_UPDATECONTEXT, RULE_ADDRESS, {
      context: { button: 'DRIV:dev:btn-2', chime: 'DING_DONG' },
      template: 'button-chime',
    });
    expect(mockBridge).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, RULE_ADDRESS, {
      [Rule.ATTR_DESCRIPTION]: 'When Smart Button 2 is pressed, play Ding Dong',
    });
  });

  it('saves name, context and description in that order when both change', async () => {
    await renderPanel({ rule: mockRule });
    renameRule('Front Door Chime');
    pickChime('CHIME');
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(mockBridge.mock.calls.slice(1)).toEqual([
      [Base.CMD_SETATTRIBUTES, RULE_ADDRESS, { [Rule.ATTR_NAME]: 'Front Door Chime' }],
      [Rule.CMD_UPDATECONTEXT, RULE_ADDRESS, { context: { button: 'DRIV:dev:btn-1', chime: 'CHIME' }, template: 'button-chime' }],
      [Base.CMD_SETATTRIBUTES, RULE_ADDRESS, { [Rule.ATTR_DESCRIPTION]: 'When Smart Button 1 is pressed, play Chime' }],
    ]);
  });

  it('does not write the new description when UpdateContext fails', async () => {
    failCommand(Rule.CMD_UPDATECONTEXT);
    await renderPanel({ rule: mockRule });
    renameRule('Front Door Chime');
    pickButton('DRIV:dev:btn-2');
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { type: 'error', message: 'Failed to save rule' } }),
      );
    });
    expect(bridgeCommands()).toEqual([RuleTemplate.CMD_RESOLVE, Base.CMD_SETATTRIBUTES, Rule.CMD_UPDATECONTEXT]);
    expectNoDescriptionSent();
    expect(mockCloseRight).not.toHaveBeenCalled();
    expect(screen.getByTestId('rule-save')).toHaveTextContent('Save');
  });

  it.each([
    ['blank', ''],
    ['raw-address', 'When DRIV:dev:btn-1 is pressed, play DING_DONG'],
  ])('repairs a %s description on Save without other changes', async (_label, brokenDescription) => {
    await renderPanel({ rule: makeRule(RULE_ADDRESS, { ...mockRule, [Rule.ATTR_DESCRIPTION]: brokenDescription }) });
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(mockBridge.mock.calls.slice(1)).toEqual([
      [Base.CMD_SETATTRIBUTES, RULE_ADDRESS, { [Rule.ATTR_DESCRIPTION]: 'When Smart Button 1 is pressed, play Ding Dong' }],
    ]);
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining(successToast));
  });

  it('blocks Save and explains why when a selection is cleared', async () => {
    await renderPanel({ rule: mockRule });
    expect(screen.queryByTestId('rule-incomplete')).not.toBeInTheDocument();
    pickChime('');
    expect(screen.getByTestId('rule-save')).toBeDisabled();
    expect(screen.getByTestId('rule-incomplete')).toHaveTextContent(
      'The rule is incomplete. Please choose a setting for CHIME.',
    );
    fireEvent.click(screen.getByTestId('rule-save'));
    expect(bridgeCommands()).toEqual([RuleTemplate.CMD_RESOLVE]);
  });

  it('makes the user pick again a saved selection that is no longer offered', async () => {
    mockBridge.mockResolvedValue({
      selectors: {
        button: { type: 'LIST', options: [['Smart Button 2', 'DRIV:dev:btn-2']] },
        chime: resolvedSelectors.selectors.chime,
      },
    });
    await renderPanel({ rule: mockRule });
    expect(screen.getByTestId('rule-var-button')).toHaveTextContent('button');
    expect(screen.getByTestId('rule-incomplete')).toHaveTextContent('Please choose a setting for BUTTON.');
    pickChime('CHIME');
    expect(screen.getByTestId('rule-save')).toBeDisabled();

    pickButton('DRIV:dev:btn-2');
    expect(screen.queryByTestId('rule-incomplete')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(mockBridge.mock.calls.slice(1)).toEqual([
      [Rule.CMD_UPDATECONTEXT, RULE_ADDRESS, { context: { button: 'DRIV:dev:btn-2', chime: 'CHIME' }, template: 'button-chime' }],
      [Base.CMD_SETATTRIBUTES, RULE_ADDRESS, { [Rule.ATTR_DESCRIPTION]: 'When Smart Button 2 is pressed, play Chime' }],
    ]);
  });

  it('re-applies the saved context on a rename without writing raw addresses when Resolve fails', async () => {
    failCommand(RuleTemplate.CMD_RESOLVE);
    await renderPanel({ rule: mockRule });
    renameRule('Front Door Chime');
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(mockBridge.mock.calls.slice(1)).toEqual([
      [Base.CMD_SETATTRIBUTES, RULE_ADDRESS, { [Rule.ATTR_NAME]: 'Front Door Chime' }],
      [Rule.CMD_UPDATECONTEXT, RULE_ADDRESS, { context: { button: 'DRIV:dev:btn-1', chime: 'DING_DONG' }, template: 'button-chime' }],
    ]);
    expectNoDescriptionSent();
  });

  it('saves only the name when the rule template is not in the catalog', async () => {
    await renderPanel({ rule: makeRule(RULE_ADDRESS, { ...mockRule, [Rule.ATTR_TEMPLATE]: 'retired-template' }) });
    renameRule('Front Door Chime');
    fireEvent.click(screen.getByTestId('rule-save'));
    await waitFor(() => {
      expect(mockCloseRight).toHaveBeenCalled();
    });
    expect(mockBridge.mock.calls).toEqual([
      [Base.CMD_SETATTRIBUTES, RULE_ADDRESS, { [Rule.ATTR_NAME]: 'Front Door Chime' }],
    ]);
  });

  it('shows delete button', async () => {
    await renderPanel({ rule: mockRule });
    expect(screen.getByText('Delete Rule')).toBeInTheDocument();
  });

  it('shows confirmation on delete click', async () => {
    await renderPanel({ rule: mockRule });
    fireEvent.click(screen.getByText('Delete Rule'));
    expect(screen.getByText('Are you sure you want to delete this rule?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
  });

  it('deletes rule on confirm', async () => {
    await renderPanel({ rule: mockRule });
    fireEvent.click(screen.getByText('Delete Rule'));
    fireEvent.click(screen.getByText('Yes, Delete'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_DELETE, 'SERV:rule:place-1.1', {});
    });
  });

  it('cancels delete confirmation', async () => {
    await renderPanel({ rule: mockRule });
    fireEvent.click(screen.getByText('Delete Rule'));
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.getByText('Delete Rule')).toBeInTheDocument();
  });

  it('allows changing a variable selection via radio', async () => {
    await renderPanel({ rule: mockRule });
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
