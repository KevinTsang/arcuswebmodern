import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Place } from '@arcus/core';
import PlaceInfoPanel from '@/components/settings/PlaceInfoPanel';
import { type PlaceData } from '@/components/settings/types';

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

jest.mock('@/store/slices/placeSlice', () => ({
  setPlace: (payload: PlaceData) => ({ type: 'place/setPlace', payload }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: { type: string; message: string }) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({ place: { placeId: 'place-1' } }),
  useAppDispatch: () => mockDispatch,
}));

const mockPlaceData: PlaceData = {
  [Base.ATTR_ADDRESS]: 'SERV:place:place-1',
  [Base.ATTR_ID]: 'place-1',
  [Place.ATTR_NAME]: 'Test Home',
  [Place.ATTR_STREETADDRESS1]: '123 Main St',
  [Place.ATTR_STREETADDRESS2]: '',
  [Place.ATTR_CITY]: 'Springfield',
  [Place.ATTR_STATEPROV]: 'IL',
  [Place.ATTR_ZIPCODE]: '62701',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

describe('PlaceInfoPanel', () => {
  it('shows pre-filled place data', () => {
    render(<PlaceInfoPanel placeData={mockPlaceData} />);
    expect(screen.getByDisplayValue('Test Home')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Springfield')).toBeInTheDocument();
  });

  it('saves updated place on Save', async () => {
    render(<PlaceInfoPanel placeData={mockPlaceData} />);
    const nameInput = screen.getByDisplayValue('Test Home');
    fireEvent.change(nameInput, { target: { value: 'Updated Home' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES,
        'SERV:place:place-1',
        expect.objectContaining({ [Place.ATTR_NAME]: 'Updated Home' }),
      );
      expect(mockCloseRight).toHaveBeenCalled();
    });
  });

  it('dispatches setPlace for active place', async () => {
    render(<PlaceInfoPanel placeData={mockPlaceData} />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'place/setPlace' }),
      );
    });
  });

  it('does not dispatch setPlace for non-active place', async () => {
    const otherPlace = { ...mockPlaceData, [Base.ATTR_ID]: 'place-2' };
    render(<PlaceInfoPanel placeData={otherPlace} />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalled();
    });
    const setPlaceCalls = mockDispatch.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'place/setPlace',
    );
    expect(setPlaceCalls).toHaveLength(0);
  });

  it('calls onSaved callback after save', async () => {
    const onSaved = jest.fn();
    render(<PlaceInfoPanel placeData={mockPlaceData} onSaved={onSaved} />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('closes panel on Cancel', () => {
    render(<PlaceInfoPanel placeData={mockPlaceData} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseRight).toHaveBeenCalled();
  });
});
