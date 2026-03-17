import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Person as PersonCap } from '@arcus/core';
import type { PersonData } from '@/store/entityTypes';
import PersonDetailPanel from '@/components/settings/PersonDetailPanel';

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
  addNotification: (payload: { type: string; message: string }) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

const mockPerson: PersonData = {
  [Base.ATTR_ADDRESS]: 'SERV:person:p2',
  [PersonCap.ATTR_FIRSTNAME]: 'Jane',
  [PersonCap.ATTR_LASTNAME]: 'Smith',
  [PersonCap.ATTR_EMAIL]: 'jane@test.com',
  [PersonCap.ATTR_MOBILENUMBER]: '555-5678',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  window.confirm = jest.fn(() => true);
});

describe('PersonDetailPanel', () => {
  it('shows person details', () => {
    render(<PersonDetailPanel person={mockPerson} placeId="place-1" />);
    // Name appears in heading + InfoRow
    expect(screen.getAllByText('Jane Smith')).toHaveLength(2);
    expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    expect(screen.getByText('555-5678')).toBeInTheDocument();
  });

  it('calls RemoveFromPlace on remove', async () => {
    render(<PersonDetailPanel person={mockPerson} placeId="place-1" />);
    fireEvent.click(screen.getByText('Remove from Place'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        PersonCap.CMD_REMOVEFROMPLACE,
        'SERV:person:p2',
        { placeId: 'place-1' },
      );
    });
  });

  it('dispatches success notification on remove', async () => {
    render(<PersonDetailPanel person={mockPerson} placeId="place-1" />);
    fireEvent.click(screen.getByText('Remove from Place'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Person removed.' },
      });
      expect(mockCloseRight).toHaveBeenCalled();
    });
  });

  it('calls onRemoved callback on remove', async () => {
    const onRemoved = jest.fn();
    render(<PersonDetailPanel person={mockPerson} placeId="place-1" onRemoved={onRemoved} />);
    fireEvent.click(screen.getByText('Remove from Place'));

    await waitFor(() => {
      expect(onRemoved).toHaveBeenCalled();
    });
  });

  it('does not remove when confirm is cancelled', () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    render(<PersonDetailPanel person={mockPerson} placeId="place-1" />);
    fireEvent.click(screen.getByText('Remove from Place'));
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('closes panel on Close', () => {
    render(<PersonDetailPanel person={mockPerson} placeId="place-1" />);
    fireEvent.click(screen.getByText('Close'));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});
