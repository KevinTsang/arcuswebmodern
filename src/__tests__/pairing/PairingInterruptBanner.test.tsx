import { render, screen, fireEvent } from '@testing-library/react';
import PairingInterruptBanner from '@/components/pairing/PairingInterruptBanner';

// ── Helpers ───────────────────────────────────────────────────────────

const mockResume = jest.fn();
const mockCancel = jest.fn();

const defaultProps = {
  reason: 'incident' as const,
  alarmActive: true,
  onResume: mockResume,
  onCancel: mockCancel,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PairingInterruptBanner', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PairingInterruptBanner {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the security alarm copy and alarm link for an incident', () => {
      render(<PairingInterruptBanner {...defaultProps} />);
      expect(screen.getByTestId('pairing-interrupted')).toHaveAttribute('data-reason', 'incident');
      expect(screen.getByText('Security Alarm')).toBeInTheDocument();
      expect(screen.getByText('Pairing mode was turned off because an alarm went off.')).toBeInTheDocument();
      expect(screen.getByTestId('pairing-interrupted-view')).toHaveAttribute('href', '/services/alarms/status');
      expect(screen.getByTestId('pairing-interrupted-view')).toHaveTextContent('View Alarm');
    });

    it('shows the care alarm copy and care link for a care alarm', () => {
      render(<PairingInterruptBanner {...defaultProps} reason="care" />);
      expect(screen.getByTestId('pairing-interrupted')).toHaveAttribute('data-reason', 'care');
      expect(screen.getByText('Care Alarm')).toBeInTheDocument();
      expect(screen.getByText('Pairing mode was turned off because a care alarm went off.')).toBeInTheDocument();
      expect(screen.getByTestId('pairing-interrupted-view')).toHaveAttribute('href', '/services/care/status');
    });
  });

  describe('interactions', () => {
    it('calls onResume when Resume Pairing is clicked after the alarm clears', () => {
      render(<PairingInterruptBanner {...defaultProps} alarmActive={false} />);
      fireEvent.click(screen.getByTestId('pairing-interrupted-resume'));
      expect(mockResume).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel is clicked', () => {
      render(<PairingInterruptBanner {...defaultProps} />);
      fireEvent.click(screen.getByTestId('pairing-interrupted-cancel'));
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });

    it('does not resume while the alarm is still active', () => {
      render(<PairingInterruptBanner {...defaultProps} />);
      const resume = screen.getByTestId('pairing-interrupted-resume');
      expect(resume).toBeDisabled();
      fireEvent.click(resume);
      expect(mockResume).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('tells the user to wait while the alarm is active', () => {
      render(<PairingInterruptBanner {...defaultProps} />);
      expect(screen.getByTestId('pairing-interrupted-hint')).toHaveTextContent(
        'You can resume pairing once the alarm has been cleared.',
      );
    });

    it('tells the user they can resume once the alarm clears', () => {
      render(<PairingInterruptBanner {...defaultProps} alarmActive={false} />);
      expect(screen.getByTestId('pairing-interrupted-hint')).toHaveTextContent(
        'The alarm has been cleared. You can resume pairing.',
      );
      expect(screen.getByTestId('pairing-interrupted-resume')).toBeEnabled();
    });
  });
});
