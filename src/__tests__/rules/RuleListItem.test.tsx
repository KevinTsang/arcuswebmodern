import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RuleListItem } from '@/components/rules/RuleListItem';
import Bridge from '@arcus/core/bridge';

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

const enabledRule: Record<string, unknown> = {
  'base:address': 'SERV:rule:place-1.1',
  'rule:name': 'My Rule',
  'rule:description': 'A test rule description',
  'rule:state': 'ENABLED',
};

const disabledRule: Record<string, unknown> = {
  'base:address': 'SERV:rule:place-1.2',
  'rule:name': 'Disabled Rule',
  'rule:state': 'DISABLED',
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
    render(<RuleListItem rule={{ 'base:address': 'x', 'rule:state': 'ENABLED' }} onEdit={jest.fn()} />);
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
      expect(mockBridge).toHaveBeenCalledWith('rule:Disable', 'SERV:rule:place-1.1', {});
    });
  });

  it('calls rule:Enable when toggling on a disabled rule', async () => {
    render(<RuleListItem rule={disabledRule} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockBridge).toHaveBeenCalledWith('rule:Enable', 'SERV:rule:place-1.2', {});
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
});
