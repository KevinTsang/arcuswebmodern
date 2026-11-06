import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Product, PairingDevice } from '@arcus/core';
import SearchingStage from '@/components/pairing/SearchingStage';
import type { PairingProduct } from '@/store/entityTypes';
import { makePairingDevice } from '../helpers/factories';

const mockDispatch = jest.fn();
const mockStartSearch = jest.fn();
const mockCancel = jest.fn();

const defaultProps = {
  product: null,
  isHubPairing: false,
  devices: [],
  earlierDevices: [],
  searchTimedOut: false,
  searchFailed: false,
  hubRegistrationState: null,
  dispatch: mockDispatch,
  onStartSearch: mockStartSearch,
  onCancel: mockCancel,
};

const mockProduct: PairingProduct = {
  [Base.ATTR_ADDRESS]: 'SERV:product:prod-1',
  [Product.ATTR_NAME]: 'Smart Plug',
  [Product.ATTR_VENDOR]: 'GE',
  [Product.ATTR_HUBREQUIRED]: true,
  [Product.ATTR_ID]: 'abc123',
};

beforeEach(() => jest.clearAllMocks());

describe('SearchingStage – device search', () => {
  it('matches snapshot', () => {
    const { container } = render(
      <SearchingStage
        {...defaultProps}
        product={mockProduct}
        devices={[makePairingDevice('plug', PairingDevice.PAIRINGSTATE_PAIRING)]}
        earlierDevices={[makePairingDevice('lock', PairingDevice.PAIRINGSTATE_MISPAIRED)]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows "Searching for Device" heading', () => {
    render(<SearchingStage {...defaultProps} />);
    expect(screen.getByText('Searching for Device')).toBeInTheDocument();
  });

  it('shows generic text when no product', () => {
    render(<SearchingStage {...defaultProps} />);
    expect(screen.getByText('Looking for devices…')).toBeInTheDocument();
  });

  it('shows product-specific text when product is set', () => {
    render(<SearchingStage {...defaultProps} product={mockProduct} />);
    expect(screen.getByText('Looking for your Smart Plug…')).toBeInTheDocument();
  });

  it('renders device rows when devices are found', () => {
    const devices = [
      { [Base.ATTR_ADDRESS]: 'DRIV:dev:d1', [PairingDevice.ATTR_PAIRINGSTATE]: 'PAIRING', [PairingDevice.ATTR_PAIRINGPHASE]: 'JOIN' },
    ];
    render(<SearchingStage {...defaultProps} devices={devices} />);
    expect(screen.getByText('Device Found')).toBeInTheDocument();
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('labels improperly paired devices left from an earlier pairing', () => {
    const plug = makePairingDevice('plug', PairingDevice.PAIRINGSTATE_PAIRING);
    const lock = makePairingDevice('lock', PairingDevice.PAIRINGSTATE_MISPAIRED);
    render(<SearchingStage {...defaultProps} devices={[plug]} earlierDevices={[lock]} />);

    const found = screen.getByTestId(`pairing-device-row-${plug[Base.ATTR_ADDRESS]}`);
    expect(found).toHaveAttribute('data-earlier', 'false');
    expect(found).toHaveTextContent('Device Found');
    const earlier = screen.getByTestId(`pairing-device-row-${lock[Base.ATTR_ADDRESS]}`);
    expect(earlier).toHaveAttribute('data-earlier', 'true');
    expect(earlier).toHaveTextContent('From an earlier pairing');
    expect(earlier).toHaveTextContent('Improperly Paired');
  });

  it('shows Cancel button while searching', () => {
    render(<SearchingStage {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked during search', () => {
    render(<SearchingStage {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCancel).toHaveBeenCalled();
  });
});

describe('SearchingStage – search timed out', () => {
  it('shows timeout message', () => {
    render(<SearchingStage {...defaultProps} searchTimedOut />);
    expect(screen.getByText('Search timed out')).toBeInTheDocument();
    expect(screen.getByText(/No devices were found/)).toBeInTheDocument();
  });

  it('calls onStartSearch on Try Again click', () => {
    render(<SearchingStage {...defaultProps} searchTimedOut />);
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockStartSearch).toHaveBeenCalled();
  });

  it('calls onCancel on Cancel click', () => {
    render(<SearchingStage {...defaultProps} searchTimedOut />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCancel).toHaveBeenCalled();
  });
});

describe('SearchingStage – search failed', () => {
  it('matches snapshot', () => {
    const { container } = render(<SearchingStage {...defaultProps} searchFailed />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('replaces the spinner with a failure message', () => {
    render(<SearchingStage {...defaultProps} searchFailed devices={[makePairingDevice('plug', PairingDevice.PAIRINGSTATE_PAIRING)]} />);
    expect(screen.getByTestId('pairing-searching')).toHaveAttribute('data-failed', 'true');
    expect(screen.getByText('Search failed')).toBeInTheDocument();
    expect(screen.getByText(/The search could not be started/)).toBeInTheDocument();
    expect(screen.queryByText('Search timed out')).not.toBeInTheDocument();
    expect(screen.queryByText(/Looking for/)).not.toBeInTheDocument();
    expect(screen.queryByText('Device Found')).not.toBeInTheDocument();
  });

  it('calls onStartSearch on Try Again click', () => {
    render(<SearchingStage {...defaultProps} searchFailed />);
    fireEvent.click(screen.getByTestId('pairing-search-retry'));
    expect(mockStartSearch).toHaveBeenCalled();
  });

  it('calls onCancel on Cancel click', () => {
    render(<SearchingStage {...defaultProps} searchFailed />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCancel).toHaveBeenCalled();
  });
});

describe('SearchingStage – hub registration', () => {
  it('shows "Registering Hub" heading', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="OFFLINE" />);
    expect(screen.getByText('Registering Hub')).toBeInTheDocument();
  });

  it('shows waiting message for OFFLINE state', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="OFFLINE" />);
    expect(screen.getByText('Waiting for hub to connect…')).toBeInTheDocument();
  });

  it('shows downloading message for DOWNLOADING state', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="DOWNLOADING" />);
    expect(screen.getByText('Downloading firmware update…')).toBeInTheDocument();
  });

  it('shows applying message for APPLYING state', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="APPLYING" />);
    expect(screen.getByText('Applying firmware update…')).toBeInTheDocument();
  });

  it('shows success for REGISTERED state', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="REGISTERED" />);
    expect(screen.getByText('Hub registered successfully!')).toBeInTheDocument();
  });

  it('shows already registered error', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="error.register.alreadyregistered" />);
    expect(screen.getByText('This hub is already registered to another account.')).toBeInTheDocument();
  });

  it('shows orphaned hub error', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="error.register.orphanedhub" />);
    expect(screen.getByText('This hub needs to be reset. Please contact support.')).toBeInTheDocument();
  });

  it('shows invalid ID error for other error states', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="error.register.invalid" />);
    expect(screen.getByText('Invalid Hub ID. Please check and try again.')).toBeInTheDocument();
  });

  it('dispatches hubRetry on Try Again click in error state', () => {
    render(<SearchingStage {...defaultProps} isHubPairing hubRegistrationState="error.register.alreadyregistered" />);
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pairing/hubRetry' }),
    );
  });
});
