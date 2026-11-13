import { render, screen, fireEvent } from '@testing-library/react';
import { Base, PairingDevice } from '@arcus/core';
import { OAuthConnectStage } from '@/components/pairing/OAuthConnectStage';
import type { OAuthStatus } from '@/components/pairing/types';
import type { PairingDevice as PairingDeviceEntity } from '@/store/entityTypes';

// ── Helpers ───────────────────────────────────────────────────────────

const mockFocusPopup = jest.fn();
const mockRetry = jest.fn();
const mockShowSteps = jest.fn();
const mockCancel = jest.fn();

const defaultProps = {
  vendor: 'Nest',
  status: 'connecting' as OAuthStatus,
  devices: [] as PairingDeviceEntity[],
  onFocusPopup: mockFocusPopup,
  onRetry: mockRetry,
  onShowSteps: mockShowSteps,
  onCancel: mockCancel,
};

const device = (id: string, state: string = PairingDevice.PAIRINGSTATE_PAIRING): PairingDeviceEntity => ({
  [Base.ATTR_ADDRESS]: `SERV:pairdev:${id}`,
  [PairingDevice.ATTR_PAIRINGSTATE]: state,
  [PairingDevice.ATTR_PAIRINGPHASE]: PairingDevice.PAIRINGPHASE_JOIN,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('OAuthConnectStage', () => {
  it('matches snapshot while connecting', () => {
    const { asFragment } = render(<OAuthConnectStage {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot after the login window closed', () => {
    const { asFragment } = render(<OAuthConnectStage {...defaultProps} status="closed" />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the connecting state with a button to show the login window', () => {
      render(<OAuthConnectStage {...defaultProps} />);
      expect(screen.getByTestId('oauth-connect')).toHaveAttribute('data-status', 'connecting');
      expect(screen.getByTestId('oauth-title')).toHaveTextContent('Connecting…');
      expect(screen.getByText(/Sign in to your Nest account/)).toBeInTheDocument();
      expect(screen.getByTestId('oauth-show-popup')).toHaveTextContent('Show Nest Login Window');
      expect(screen.queryByTestId('oauth-retry')).not.toBeInTheDocument();
    });

    it('shows the authorized state while devices are added', () => {
      render(<OAuthConnectStage {...defaultProps} status="authorized" />);
      expect(screen.getByTestId('oauth-title')).toHaveTextContent('Adding Devices…');
      expect(screen.getByText(/Nest account is connected/)).toBeInTheDocument();
      expect(screen.queryByTestId('oauth-show-popup')).not.toBeInTheDocument();
    });

    it('shows the closed state with a retry button', () => {
      render(<OAuthConnectStage {...defaultProps} status="closed" />);
      expect(screen.getByTestId('oauth-title')).toHaveTextContent('No New Nest Devices Found');
      expect(screen.getByTestId('oauth-failed')).toHaveTextContent('Nest Login Window Closed');
      expect(screen.getByTestId('oauth-retry')).toBeInTheDocument();
    });

    it('shows the blocked state with a retry button', () => {
      render(<OAuthConnectStage {...defaultProps} status="blocked" />);
      expect(screen.getByTestId('oauth-blocked')).toHaveTextContent('Allow popups');
      expect(screen.getByTestId('oauth-retry')).toBeInTheDocument();
    });

    it('shows the timed-out state with a button back to the steps', () => {
      render(<OAuthConnectStage {...defaultProps} status="timedOut" />);
      expect(screen.getByTestId('oauth-title')).toHaveTextContent('Pairing Has Timed Out');
      expect(screen.getByTestId('oauth-timed-out')).toBeInTheDocument();
      expect(screen.getByTestId('oauth-show-steps')).toBeInTheDocument();
      expect(screen.queryByTestId('oauth-retry')).not.toBeInTheDocument();
    });

    it('lists the devices found and counts them in the title', () => {
      render(<OAuthConnectStage {...defaultProps} devices={[device('1'), device('2')]} />);
      expect(screen.getByTestId('oauth-title')).toHaveTextContent('2 Devices Found!');
      expect(screen.getAllByText('Device Found')).toHaveLength(2);
    });

    it('uses the singular for one device', () => {
      render(<OAuthConnectStage {...defaultProps} status="authorized" devices={[device('1')]} />);
      expect(screen.getByTestId('oauth-title')).toHaveTextContent('1 Device Found!');
    });
  });

  describe('interactions', () => {
    it('focuses the popup', () => {
      render(<OAuthConnectStage {...defaultProps} />);
      fireEvent.click(screen.getByTestId('oauth-show-popup'));
      expect(mockFocusPopup).toHaveBeenCalledTimes(1);
    });

    it('retries the login', () => {
      render(<OAuthConnectStage {...defaultProps} status="closed" />);
      fireEvent.click(screen.getByTestId('oauth-retry'));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('returns to the steps after a timeout', () => {
      render(<OAuthConnectStage {...defaultProps} status="timedOut" />);
      fireEvent.click(screen.getByTestId('oauth-show-steps'));
      expect(mockShowSteps).toHaveBeenCalledTimes(1);
    });

    it('cancels pairing', () => {
      render(<OAuthConnectStage {...defaultProps} />);
      fireEvent.click(screen.getByTestId('oauth-cancel'));
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('falls back to generic copy without a vendor', () => {
      render(<OAuthConnectStage {...defaultProps} vendor="" status="closed" />);
      expect(screen.getByTestId('oauth-title')).toHaveTextContent('No New Devices Found');
      expect(screen.getByTestId('oauth-failed')).toHaveTextContent(/^Login Window Closed/);
    });

    it('shows a generic login window button without a vendor', () => {
      render(<OAuthConnectStage {...defaultProps} vendor="" />);
      expect(screen.getByTestId('oauth-show-popup')).toHaveTextContent(/^Show Login Window$/);
      expect(screen.getByText(/Sign in to your account in the popup/)).toBeInTheDocument();
    });
  });
});
