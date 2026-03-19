import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePinPanel from '@/components/settings/ChangePinPanel';

const mockCloseRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: {
    request: (...args: any[]) => mockBridgeRequest(...args),
    restfulRequest: (...args: any[]) => mockBridgeRequest(...args),
  },
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ closeRight: mockCloseRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      auth: { person: { personId: 'person-1' } },
      place: { placeId: 'place-1' },
    }),
  useAppDispatch: () => mockDispatch,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

describe('ChangePinPanel', () => {
  it('renders heading', () => {
    render(<ChangePinPanel />);
    expect(screen.getByText('Change PIN Code')).toBeInTheDocument();
  });

  it('renders PIN form fields', () => {
    render(<ChangePinPanel />);
    expect(screen.getByLabelText('PIN Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm PIN Code')).toBeInTheDocument();
  });

  it('renders Change PIN button', () => {
    render(<ChangePinPanel />);
    expect(screen.getByRole('button', { name: 'Change PIN' })).toBeInTheDocument();
  });

  it('calls ChangePinV2 with correct params on submit', async () => {
    render(<ChangePinPanel />);

    const pinInput = screen.getByLabelText('PIN Code');
    const confirmInput = screen.getByLabelText('Confirm PIN Code');

    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.change(confirmInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change PIN' }));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'person:ChangePinV2',
        'SERV:person:person-1',
        { place: 'place-1', pin: '1234' },
      );
    });
  });

  it('shows success notification and closes panel on success', async () => {
    render(<ChangePinPanel />);

    fireEvent.change(screen.getByLabelText('PIN Code'), { target: { value: '5678' } });
    fireEvent.change(screen.getByLabelText('Confirm PIN Code'), { target: { value: '5678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change PIN' }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'PIN code updated.' },
      });
      expect(mockCloseRight).toHaveBeenCalled();
    });
  });

  it('shows error on failure', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<ChangePinPanel />);

    fireEvent.change(screen.getByLabelText('PIN Code'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Confirm PIN Code'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change PIN' }));

    await waitFor(() => {
      expect(screen.getByText('PIN code was unable to be changed. Please try again.')).toBeInTheDocument();
    });
  });

  it('closes panel on Skip', () => {
    render(<ChangePinPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});
