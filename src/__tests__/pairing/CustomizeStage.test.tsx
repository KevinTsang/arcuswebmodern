import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Product } from '@arcus/core';
import CustomizeStage from '@/components/pairing/CustomizeStage';
import type { PairingProduct } from '@/store/entityTypes';

const mockDispatch = jest.fn();
const mockCustomize = jest.fn();

const defaultProps = {
  isHubPairing: false,
  product: null,
  deviceName: '',
  isFavorite: false,
  saving: false,
  dispatch: mockDispatch,
  onCustomize: mockCustomize,
};

const mockProduct: PairingProduct = {
  [Base.ATTR_ADDRESS]: 'SERV:product:prod-1',
  [Product.ATTR_NAME]: 'Smart Plug',
  [Product.ATTR_VENDOR]: 'GE',
  [Product.ATTR_HUBREQUIRED]: true,
  [Product.ATTR_ID]: 'abc123',
};

beforeEach(() => jest.clearAllMocks());

describe('CustomizeStage – device pairing', () => {
  it('matches snapshot', () => {
    const { container } = render(<CustomizeStage {...defaultProps} product={mockProduct} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('disables Save & Finish while the customization is saving', () => {
    render(<CustomizeStage {...defaultProps} saving />);
    const save = screen.getByTestId('pairing-customize-save');
    expect(save).toBeDisabled();
    expect(save).toHaveTextContent('Saving…');
    fireEvent.click(save);
    expect(mockCustomize).not.toHaveBeenCalled();
  });

  it('shows "Customize Your Device" heading', () => {
    render(<CustomizeStage {...defaultProps} />);
    expect(screen.getByText('Customize Your Device')).toBeInTheDocument();
  });

  it('shows "Device Name" label', () => {
    render(<CustomizeStage {...defaultProps} />);
    expect(screen.getByText('Device Name')).toBeInTheDocument();
  });

  it('uses product name as placeholder', () => {
    render(<CustomizeStage {...defaultProps} product={mockProduct} />);
    expect(screen.getByPlaceholderText('Smart Plug')).toBeInTheDocument();
  });

  it('uses "New Device" placeholder when no product', () => {
    render(<CustomizeStage {...defaultProps} />);
    expect(screen.getByPlaceholderText('New Device')).toBeInTheDocument();
  });

  it('dispatches setDeviceName on input change', () => {
    render(<CustomizeStage {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('New Device'), { target: { value: 'Living Room' } });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pairing/setDeviceName', payload: 'Living Room' }),
    );
  });

  it('shows "Add to favorites" checkbox', () => {
    render(<CustomizeStage {...defaultProps} />);
    expect(screen.getByText('Add to favorites')).toBeInTheDocument();
  });

  it('dispatches setFavorite on checkbox change', () => {
    render(<CustomizeStage {...defaultProps} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pairing/setFavorite', payload: true }),
    );
  });

  it('shows "Save & Finish" button', () => {
    render(<CustomizeStage {...defaultProps} />);
    expect(screen.getByText('Save & Finish')).toBeInTheDocument();
  });

  it('calls onCustomize on button click', () => {
    render(<CustomizeStage {...defaultProps} />);
    fireEvent.click(screen.getByText('Save & Finish'));
    expect(mockCustomize).toHaveBeenCalled();
  });
});

describe('CustomizeStage – hub pairing', () => {
  it('shows "Name Your Hub" heading', () => {
    render(<CustomizeStage {...defaultProps} isHubPairing />);
    expect(screen.getByText('Name Your Hub')).toBeInTheDocument();
  });

  it('shows "Hub Name" label', () => {
    render(<CustomizeStage {...defaultProps} isHubPairing />);
    expect(screen.getByText('Hub Name')).toBeInTheDocument();
  });

  it('uses "My Hub" placeholder', () => {
    render(<CustomizeStage {...defaultProps} isHubPairing />);
    expect(screen.getByPlaceholderText('My Hub')).toBeInTheDocument();
  });

  it('does not show favorites checkbox', () => {
    render(<CustomizeStage {...defaultProps} isHubPairing />);
    expect(screen.queryByText('Add to favorites')).not.toBeInTheDocument();
  });

  it('shows "Save & Continue" button', () => {
    render(<CustomizeStage {...defaultProps} isHubPairing />);
    expect(screen.getByText('Save & Continue')).toBeInTheDocument();
  });
});
