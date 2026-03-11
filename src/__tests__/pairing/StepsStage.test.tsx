import { render, screen, fireEvent } from '@testing-library/react';
import StepsStage from '@/components/pairing/StepsStage';

const mockDispatch = jest.fn();
const mockStartSearch = jest.fn();
const mockStartHubRegistration = jest.fn();

const defaultProps = {
  product: null,
  isHubPairing: false,
  steps: [],
  currentStep: 0,
  loading: false,
  hubId: '',
  dispatch: mockDispatch,
  onStartSearch: mockStartSearch,
  onStartHubRegistration: mockStartHubRegistration,
};

const mockProduct = {
  'base:address': 'SERV:product:prod-1',
  'product:name': 'Smart Plug',
  'product:vendor': 'GE',
  'product:hubRequired': true,
  'product:id': 'abc123',
};

const mockSteps = [
  { id: 's1', order: 1, instructions: ['Press the button on top'] },
  { id: 's2', order: 2, instructions: ['Wait for the light to blink'] },
  { id: 's3', order: 3, instructions: ['Done'] },
];

beforeEach(() => jest.clearAllMocks());

describe('StepsStage – generic pairing (no product)', () => {
  it('shows "Starting device search…" when no product and not hub pairing', () => {
    render(<StepsStage {...defaultProps} />);
    expect(screen.getByText('Starting device search…')).toBeInTheDocument();
  });
});

describe('StepsStage – hub pairing', () => {
  it('renders HubRegistrationSteps when isHubPairing', () => {
    render(<StepsStage {...defaultProps} isHubPairing />);
    expect(screen.getByText('Register Your Hub')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('AAA-0000')).toBeInTheDocument();
  });

  it('dispatches setHubId on input change', () => {
    render(<StepsStage {...defaultProps} isHubPairing />);
    fireEvent.change(screen.getByPlaceholderText('AAA-0000'), { target: { value: 'ABC-1234' } });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pairing/setHubId', payload: 'ABC-1234' }),
    );
  });

  it('disables Register Hub button when hubId is empty', () => {
    render(<StepsStage {...defaultProps} isHubPairing hubId="" />);
    expect(screen.getByText('Register Hub')).toBeDisabled();
  });

  it('enables Register Hub button when hubId is set', () => {
    render(<StepsStage {...defaultProps} isHubPairing hubId="ABC-1234" />);
    expect(screen.getByText('Register Hub')).not.toBeDisabled();
  });

  it('calls onStartHubRegistration on click', () => {
    render(<StepsStage {...defaultProps} isHubPairing hubId="ABC-1234" />);
    fireEvent.click(screen.getByText('Register Hub'));
    expect(mockStartHubRegistration).toHaveBeenCalled();
  });
});

describe('StepsStage – product pairing with no steps', () => {
  it('shows fallback instructions and Search button', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} />);
    expect(screen.getByText('Pairing Instructions')).toBeInTheDocument();
    expect(screen.getByText(/Follow the manufacturer/)).toBeInTheDocument();
    expect(screen.getByText('Search for Device')).toBeInTheDocument();
  });

  it('calls onStartSearch when Search button is clicked', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} />);
    fireEvent.click(screen.getByText('Search for Device'));
    expect(mockStartSearch).toHaveBeenCalled();
  });

  it('disables button and shows "Starting…" when loading', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} loading />);
    const btn = screen.getByText('Starting…');
    expect(btn).toBeDisabled();
  });
});

describe('StepsStage – product pairing with steps', () => {
  it('shows step counter and instructions', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} steps={mockSteps} currentStep={0} />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Press the button on top')).toBeInTheDocument();
  });

  it('does not show Previous on first step', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} steps={mockSteps} currentStep={0} />);
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
  });

  it('shows Next on non-last step', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} steps={mockSteps} currentStep={0} />);
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('dispatches nextStep on Next click', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} steps={mockSteps} currentStep={0} />);
    fireEvent.click(screen.getByText('Next'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pairing/nextStep' }),
    );
  });

  it('shows Previous on middle step', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} steps={mockSteps} currentStep={1} />);
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('dispatches prevStep on Previous click', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} steps={mockSteps} currentStep={1} />);
    fireEvent.click(screen.getByText('Previous'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pairing/prevStep' }),
    );
  });

  it('shows "Search for Device" on last step instead of Next', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} steps={mockSteps} currentStep={2} />);
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    expect(screen.getByText('Search for Device')).toBeInTheDocument();
  });

  it('calls onStartSearch on last step Search click', () => {
    render(<StepsStage {...defaultProps} product={mockProduct} steps={mockSteps} currentStep={2} />);
    fireEvent.click(screen.getByText('Search for Device'));
    expect(mockStartSearch).toHaveBeenCalled();
  });
});
