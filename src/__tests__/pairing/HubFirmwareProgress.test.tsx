import { render, screen } from '@testing-library/react';
import { HubFirmwareProgress } from '@/components/pairing/HubFirmwareProgress';
import { HubFirmwareState } from '@/lib/hubFirmware';

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubFirmwareProgress', () => {
  it('matches snapshot while downloading', () => {
    const { asFragment } = render(<HubFirmwareProgress state={HubFirmwareState.DOWNLOADING} percent={40} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot while applying', () => {
    const { asFragment } = render(<HubFirmwareProgress state={HubFirmwareState.APPLYING} percent={90} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the download title, label and percentage', () => {
    render(<HubFirmwareProgress state={HubFirmwareState.DOWNLOADING} percent={40} />);
    expect(screen.getByTestId('hub-firmware-title')).toHaveTextContent('Update Available');
    expect(screen.getByText('Downloading firmware update…')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText(/downloading the latest firmware/)).toBeInTheDocument();
  });

  it('shows the apply title and copy', () => {
    render(<HubFirmwareProgress state={HubFirmwareState.APPLYING} percent={90} />);
    expect(screen.getByTestId('hub-firmware-title')).toHaveTextContent('Applying Update…');
    expect(screen.getByText('Applying firmware update…')).toBeInTheDocument();
    expect(screen.getByText(/flash several lights/)).toBeInTheDocument();
  });

  it('exposes the phase and percentage as data attributes', () => {
    render(<HubFirmwareProgress state={HubFirmwareState.APPLYING} percent={12} />);
    const progress = screen.getByTestId('hub-firmware-progress');
    expect(progress).toHaveAttribute('data-state', HubFirmwareState.APPLYING);
    expect(progress).toHaveAttribute('data-percent', '12');
  });

  it('warns the user not to leave', () => {
    render(<HubFirmwareProgress state={HubFirmwareState.DOWNLOADING} percent={0} />);
    expect(screen.getByTestId('hub-firmware-warning')).toHaveTextContent('Please do not leave this page');
  });

  it('shows 0% before the platform reports progress', () => {
    render(<HubFirmwareProgress state={HubFirmwareState.DOWNLOADING} percent={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
