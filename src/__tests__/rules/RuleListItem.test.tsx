import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RuleListItem } from '@/components/rules/RuleListItem';
import Bridge from '@arcus/core/bridge';
import { Base, Rule } from '@arcus/core';
import type { RuleEntity } from '@/store/entityTypes';

const mockDispatch = jest.fn();

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

const mockBridge = Bridge.request as jest.Mock;

const enabledRule: RuleEntity = {
  id: 'SERV:rule:place-1.1',
  [Base.ATTR_ADDRESS]: 'SERV:rule:place-1.1',
  [Rule.ATTR_NAME]: 'My Rule',
  [Rule.ATTR_DESCRIPTION]: 'A test rule description',
  [Rule.ATTR_STATE]: 'ENABLED',
};

const disabledRule: RuleEntity = {
  id: 'SERV:rule:place-1.2',
  [Base.ATTR_ADDRESS]: 'SERV:rule:place-1.2',
  [Rule.ATTR_NAME]: 'Disabled Rule',
  [Rule.ATTR_STATE]: 'DISABLED',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBridge.mockResolvedValue({});
});

describe('RuleListItem', () => {
  it('renders rule name and description', () => {
    render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    expect(screen.getByText('My Rule')).toBeInTheDocument();
    expect(screen.getByText('A test rule description')).toBeInTheDocument();
  });

  it('renders fallback name for unnamed rules', () => {
    render(<RuleListItem rule={{ [Base.ATTR_ADDRESS]: 'x', [Rule.ATTR_STATE]: 'ENABLED' }} onEdit={jest.fn()} />);
    expect(screen.getByText('Unnamed Rule')).toBeInTheDocument();
  });

  it('shows toggle in enabled state', () => {
    render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('shows toggle in disabled state with reduced opacity', () => {
    render(<RuleListItem rule={disabledRule} onEdit={jest.fn()} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('calls rule:Disable when toggling off an enabled rule', async () => {
    render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_DISABLE, 'SERV:rule:place-1.1', {});
    });
  });

  it('calls rule:Enable when toggling on a disabled rule', async () => {
    render(<RuleListItem rule={disabledRule} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith(Rule.CMD_ENABLE, 'SERV:rule:place-1.2', {});
    });
  });

  it('dispatches error on toggle failure', async () => {
    mockBridge.mockRejectedValue(new Error('fail'));
    render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'error' }),
        }),
      );
    });
  });

  it('calls onEdit with rule when Edit clicked', () => {
    const onEdit = jest.fn();
    render(<RuleListItem rule={enabledRule} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(enabledRule);
  });

  describe('favorite', () => {
    const favId = 'rule-favorite-SERV:rule:place-1.1';
    const favoriteRule: RuleEntity = { ...enabledRule, [Base.ATTR_TAGS]: ['FAVORITE'] };

    it('renders an unfilled star when the rule is not a favorite', () => {
      render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
      expect(screen.getByTestId(favId)).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders a filled star when the rule is tagged FAVORITE', () => {
      render(<RuleListItem rule={favoriteRule} onEdit={jest.fn()} />);
      expect(screen.getByTestId(favId)).toHaveAttribute('aria-pressed', 'true');
    });

    it('adds the FAVORITE tag via base:AddTags when clicked', async () => {
      render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
      fireEvent.click(screen.getByTestId(favId));
      await waitFor(() => {
        expect(mockBridge).toHaveBeenCalledWith(Base.CMD_ADDTAGS, 'SERV:rule:place-1.1', { tags: ['FAVORITE'] });
      });
      expect(mockBridge).toHaveBeenCalledTimes(1);
    });

    it('removes the FAVORITE tag via base:RemoveTags for a favorite rule', async () => {
      render(<RuleListItem rule={favoriteRule} onEdit={jest.fn()} />);
      fireEvent.click(screen.getByTestId(favId));
      await waitFor(() => {
        expect(mockBridge).toHaveBeenCalledWith(Base.CMD_REMOVETAGS, 'SERV:rule:place-1.1', { tags: ['FAVORITE'] });
      });
    });

    it('dispatches an error notification when favoriting fails', async () => {
      mockBridge.mockRejectedValueOnce(new Error('fail'));
      render(<RuleListItem rule={enabledRule} onEdit={jest.fn()} />);
      fireEvent.click(screen.getByTestId(favId));
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to add My Rule to favorites' },
        });
      });
    });
  });
});
