import { fireEvent, render, screen } from '@testing-library/react';
import { HubFirmwareExitModal } from '@/components/pairing/HubFirmwareExitModal';

// ── Helpers ───────────────────────────────────────────────────────────

const mockAcknowledge = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubFirmwareExitModal', () => {
  it('matches snapshot when open', () => {
    const { asFragment } = render(<HubFirmwareExitModal open onAcknowledge={mockAcknowledge} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders a labelled dialog with the warning', () => {
    render(<HubFirmwareExitModal open onAcknowledge={mockAcknowledge} />);
    expect(screen.getByRole('dialog', { name: 'Firmware Update in Progress' })).toBeInTheDocument();
    expect(screen.getByText('Please do not exit the firmware update process until complete.')).toBeInTheDocument();
  });

  it('calls onAcknowledge when Okay is clicked', () => {
    render(<HubFirmwareExitModal open onAcknowledge={mockAcknowledge} />);
    fireEvent.click(screen.getByTestId('hub-firmware-exit-ok'));
    expect(mockAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    const { asFragment } = render(<HubFirmwareExitModal open={false} onAcknowledge={mockAcknowledge} />);
    expect(screen.queryByTestId('hub-firmware-exit-modal')).not.toBeInTheDocument();
    expect(asFragment().childNodes).toHaveLength(0);
  });
});
