import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Place, WeatherRadio } from '@arcus/core';
import NoaaLocationConfigurator from '@/components/devices/NoaaLocationConfigurator';
import type { DeviceEntity, PlaceData } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:radio';
const mockSetAttribute = jest.fn();
const mockDispatch = jest.fn();
const mockListSameStates = jest.fn();
const mockListSameCounties = jest.fn();
const mockGetSameCode = jest.fn();
let mockDevice: DeviceEntity | undefined;
let mockPlace: Partial<PlaceData> | null;

jest.mock('@arcus/core', () => ({
  ...jest.requireActual('@arcus/core'),
  NwsSameCodeService: {
    ListSameStates: () => mockListSameStates(),
    ListSameCounties: (state: string) => mockListSameCounties(state),
    GetSameCode: (state: string, county: string) => mockGetSameCode(state, county),
  },
}));

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({ setAttribute: mockSetAttribute }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: { place: { place: Partial<PlaceData> | null } }) => unknown) =>
    sel({ place: { place: mockPlace } }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function error(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

const STATES = [
  { stateCode: 'TX', state: 'Texas' },
  { stateCode: 'CA', state: 'California' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockDevice = makeDevice(ADDR, { [WeatherRadio.ATTR_LOCATION]: '048453' });
  mockPlace = { [Place.ATTR_STATE]: 'TX', [Place.ATTR_ADDRCOUNTY]: 'Travis' };
  mockListSameStates.mockResolvedValue({ sameStates: STATES });
  mockListSameCounties.mockImplementation((state: string) =>
    Promise.resolve({ counties: state === 'TX' ? ['Travis', 'Bexar'] : ['Marin'] }),
  );
  mockGetSameCode.mockResolvedValue({ code: '048029' });
  mockSetAttribute.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('NoaaLocationConfigurator', () => {
  it('matches snapshot', async () => {
    const { asFragment } = render(<NoaaLocationConfigurator address={ADDR} />);
    await screen.findByTestId('noaa-location-county');
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows a loading message until states arrive', () => {
    mockListSameStates.mockReturnValueOnce(new Promise(() => {}));
    render(<NoaaLocationConfigurator address={ADDR} />);
    expect(screen.getByTestId('noaa-location-loading')).toBeInTheDocument();
  });

  it('preselects the place state and county and shows the current code', async () => {
    render(<NoaaLocationConfigurator address={ADDR} />);
    const county = await screen.findByTestId('noaa-location-county');

    expect(screen.getByTestId('noaa-location-state')).toHaveValue('TX');
    expect(county).toHaveValue('Travis');
    expect(mockListSameCounties).toHaveBeenCalledWith('TX');
    expect(screen.getByTestId('noaa-location-code')).toHaveTextContent('S.A.M.E. code: 048453');
  });

  it('loads counties for a newly chosen state', async () => {
    render(<NoaaLocationConfigurator address={ADDR} />);
    await screen.findByTestId('noaa-location-county');
    fireEvent.change(screen.getByTestId('noaa-location-state'), { target: { value: 'CA' } });

    await waitFor(() => expect(mockListSameCounties).toHaveBeenCalledWith('CA'));
    expect(await screen.findByRole('option', { name: 'Marin' })).toBeInTheDocument();
    expect(screen.getByTestId('noaa-location-county')).toHaveValue('');
  });

  it('saves the S.A.M.E. code for the chosen county', async () => {
    render(<NoaaLocationConfigurator address={ADDR} />);
    fireEvent.change(await screen.findByTestId('noaa-location-county'), { target: { value: 'Bexar' } });

    await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(WeatherRadio.ATTR_LOCATION, '048029'));
    expect(mockGetSameCode).toHaveBeenCalledWith('TX', 'Bexar');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('disables the county picker while saving', async () => {
    mockGetSameCode.mockReturnValueOnce(new Promise(() => {}));
    render(<NoaaLocationConfigurator address={ADDR} />);
    fireEvent.change(await screen.findByTestId('noaa-location-county'), { target: { value: 'Bexar' } });

    await waitFor(() => expect(screen.getByTestId('noaa-location-county')).toBeDisabled());
  });

  it('does not save when the county is cleared', async () => {
    render(<NoaaLocationConfigurator address={ADDR} />);
    fireEvent.change(await screen.findByTestId('noaa-location-county'), { target: { value: '' } });

    expect(mockGetSameCode).not.toHaveBeenCalled();
  });

  it('shows an error when the code lookup fails', async () => {
    mockGetSameCode.mockRejectedValueOnce(new Error('fail'));
    render(<NoaaLocationConfigurator address={ADDR} />);
    fireEvent.change(await screen.findByTestId('noaa-location-county'), { target: { value: 'Bexar' } });

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to update weather radio location')));
    expect(mockSetAttribute).not.toHaveBeenCalled();
  });

  it('shows an error when saving the location fails', async () => {
    mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
    render(<NoaaLocationConfigurator address={ADDR} />);
    fireEvent.change(await screen.findByTestId('noaa-location-county'), { target: { value: 'Bexar' } });

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to update weather radio location')));
    await waitFor(() => expect(screen.getByTestId('noaa-location-county')).not.toBeDisabled());
  });

  it('shows an error when states fail to load', async () => {
    mockListSameStates.mockRejectedValueOnce(new Error('fail'));
    render(<NoaaLocationConfigurator address={ADDR} />);

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to load states')));
  });

  it('shows an error when counties fail to load', async () => {
    mockListSameCounties.mockRejectedValueOnce(new Error('fail'));
    render(<NoaaLocationConfigurator address={ADDR} />);

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to load counties')));
    expect(screen.queryByTestId('noaa-location-county')).not.toBeInTheDocument();
  });

  it('waits for a state choice when the place has no address', async () => {
    mockPlace = null;
    mockDevice = makeDevice(ADDR);
    render(<NoaaLocationConfigurator address={ADDR} />);

    expect(await screen.findByTestId('noaa-location-state')).toHaveValue('');
    expect(mockListSameCounties).not.toHaveBeenCalled();
    expect(screen.getByTestId('noaa-location-code')).toHaveTextContent('No location set');
  });
});
