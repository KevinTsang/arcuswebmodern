import { render, screen, fireEvent } from '@testing-library/react';
import CompletedStage from '@/components/pairing/CompletedStage';

const mockFinish = jest.fn();
const mockPairAnother = jest.fn();

const defaultProps = {
  isHubPairing: false,
  activeDevice: null,
  productName: 'GE Smart Plug',
  onFinish: mockFinish,
  onPairAnother: mockPairAnother,
};

beforeEach(() => jest.clearAllMocks());

describe('CompletedStage – successful device pairing', () => {
  it('shows "Device Paired!" heading', () => {
    render(<CompletedStage {...defaultProps} />);
    expect(screen.getByText('Device Paired!')).toBeInTheDocument();
  });

  it('shows product name in success message', () => {
    render(<CompletedStage {...defaultProps} />);
    expect(screen.getByText('GE Smart Plug has been successfully paired.')).toBeInTheDocument();
  });

  it('shows "Go to Devices" button', () => {
    render(<CompletedStage {...defaultProps} />);
    expect(screen.getByText('Go to Devices')).toBeInTheDocument();
  });

  it('shows "Pair Another" button', () => {
    render(<CompletedStage {...defaultProps} />);
    expect(screen.getByText('Pair Another')).toBeInTheDocument();
  });

  it('calls onFinish when Go to Devices is clicked', () => {
    render(<CompletedStage {...defaultProps} />);
    fireEvent.click(screen.getByText('Go to Devices'));
    expect(mockFinish).toHaveBeenCalled();
  });

  it('calls onPairAnother when Pair Another is clicked', () => {
    render(<CompletedStage {...defaultProps} />);
    fireEvent.click(screen.getByText('Pair Another'));
    expect(mockPairAnother).toHaveBeenCalled();
  });
});

describe('CompletedStage – successful hub pairing', () => {
  it('shows "Hub Ready!" heading', () => {
    render(<CompletedStage {...defaultProps} isHubPairing />);
    expect(screen.getByText('Hub Ready!')).toBeInTheDocument();
  });

  it('shows hub success message', () => {
    render(<CompletedStage {...defaultProps} isHubPairing />);
    expect(screen.getByText('Your hub is connected and ready to use.')).toBeInTheDocument();
  });
});

describe('CompletedStage – mispaired device', () => {
  const mispairedDevice = {
    'base:address': 'DRIV:dev:dev-1',
    'pairdev:pairingState': 'MISPAIRED',
    'pairdev:pairingPhase': 'FAILED',
  };

  it('shows "Improperly Paired" heading', () => {
    render(<CompletedStage {...defaultProps} activeDevice={mispairedDevice} />);
    expect(screen.getByText('Improperly Paired')).toBeInTheDocument();
  });

  it('shows mispaired message', () => {
    render(<CompletedStage {...defaultProps} activeDevice={mispairedDevice} />);
    expect(screen.getByText(/not paired correctly/)).toBeInTheDocument();
  });

  it('does not show success heading when mispaired', () => {
    render(<CompletedStage {...defaultProps} activeDevice={mispairedDevice} />);
    expect(screen.queryByText('Device Paired!')).not.toBeInTheDocument();
  });
});

describe('CompletedStage – misconfigured device', () => {
  const misconfiguredDevice = {
    'base:address': 'DRIV:dev:dev-1',
    'pairdev:pairingState': 'MISCONFIGURED',
    'pairdev:pairingPhase': 'FAILED',
  };

  it('shows "Improperly Paired" for MISCONFIGURED state', () => {
    render(<CompletedStage {...defaultProps} activeDevice={misconfiguredDevice} />);
    expect(screen.getByText('Improperly Paired')).toBeInTheDocument();
  });
});
