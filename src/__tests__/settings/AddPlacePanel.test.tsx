import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddPlacePanel from '@/components/settings/AddPlacePanel';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/slices/placeSlice', () => ({
  setPlace: (payload: unknown) => ({ type: 'place/setPlace', payload }),
}));

let mockAccount: Record<string, unknown> | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      auth: { account: mockAccount },
    }),
  useAppDispatch: () => mockDispatch,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAccount = {
    'base:address': 'SERV:account:acct-1',
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('AddPlacePanel – rendering', () => {
  it('shows heading', () => {
    render(<AddPlacePanel />);
    expect(screen.getByText('Add a Place')).toBeInTheDocument();
  });

  it('shows all address fields', () => {
    render(<AddPlacePanel />);
    expect(screen.getByText('Place Name')).toBeInTheDocument();
    expect(screen.getByText('Street Address')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('State')).toBeInTheDocument();
    expect(screen.getByText('ZIP Code')).toBeInTheDocument();
  });

  it('shows Create Place and Cancel buttons', () => {
    render(<AddPlacePanel />);
    expect(screen.getByText('Create Place')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables Create Place when name is empty', () => {
    render(<AddPlacePanel />);
    expect(screen.getByText('Create Place')).toBeDisabled();
  });
});

describe('AddPlacePanel – interactions', () => {
  it('enables Create Place when name is entered', () => {
    render(<AddPlacePanel />);
    const nameInput = screen.getByPlaceholderText('e.g. Lake House');
    fireEvent.change(nameInput, { target: { value: 'Beach House' } });
    expect(screen.getByText('Create Place')).not.toBeDisabled();
  });

  it('calls account:AddPlace with form data on submit', async () => {
    mockBridgeRequest.mockResolvedValue({ 'place:name': 'Beach House' });
    render(<AddPlacePanel />);

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Beach House' } });
    fireEvent.change(inputs[1], { target: { value: '456 Ocean Ave' } });
    fireEvent.change(inputs[2], { target: { value: 'Malibu' } });
    fireEvent.change(inputs[3], { target: { value: 'CA' } });
    fireEvent.change(inputs[4], { target: { value: '90265' } });

    fireEvent.click(screen.getByText('Create Place'));

    await waitFor(() =>
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'account:AddPlace',
        'SERV:account:acct-1',
        {
          place: {
            'place:name': 'Beach House',
            'place:streetAddress1': '456 Ocean Ave',
            'place:city': 'Malibu',
            'place:stateProv': 'CA',
            'place:zipCode': '90265',
          },
          serviceLevel: 'BASIC',
        },
      ),
    );
  });

  it('dispatches setPlace and success notification on success', async () => {
    const newPlace = { 'place:name': 'Beach House' };
    mockBridgeRequest.mockResolvedValue(newPlace);
    render(<AddPlacePanel />);

    const nameInput = screen.getByPlaceholderText('e.g. Lake House');
    fireEvent.change(nameInput, { target: { value: 'Beach House' } });
    fireEvent.click(screen.getByText('Create Place'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'place/setPlace',
        payload: newPlace,
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Place created!' },
      });
      expect(mockCloseRight).toHaveBeenCalled();
    });
  });

  it('dispatches error notification on failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<AddPlacePanel />);

    const nameInput = screen.getByPlaceholderText('e.g. Lake House');
    fireEvent.change(nameInput, { target: { value: 'Beach House' } });
    fireEvent.click(screen.getByText('Create Place'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to create place.' },
      }),
    );
  });

  it('closes panel on Cancel click', () => {
    render(<AddPlacePanel />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});
