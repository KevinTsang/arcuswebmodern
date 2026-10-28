import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceForceRemoveConfirm } from '@/components/devices/DeviceForceRemoveConfirm';

// ── Helpers ───────────────────────────────────────────────────────────

const onConfirm = jest.fn();
const onBack = jest.fn();

function renderConfirm(forcing = false) {
  return render(
    <DeviceForceRemoveConfirm name="Front Door Lock" forcing={forcing} onConfirm={onConfirm} onBack={onBack} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceForceRemoveConfirm', () => {
  it('matches snapshot', () => {
    const { container } = renderConfirm();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot while dev:ForceRemove is pending', () => {
    const { container } = renderConfirm(true);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('warns that the device is not excluded from the network', () => {
    renderConfirm();
    expect(screen.getByTestId('device-force-remove-warning')).toHaveTextContent(
      'Force Remove deletes Front Door Lock from your account without excluding it from the hub\'s network.',
    );
  });

  it.each([
    [false, 'confirmForce'],
    [true, 'forcing'],
  ])('exposes the stage (forcing=%s → %s)', (forcing, stage) => {
    renderConfirm(forcing);
    expect(screen.getByTestId('device-remove-status')).toHaveAttribute('data-stage', stage);
  });

  it('force removes on Yes, Force Remove', () => {
    renderConfirm();
    fireEvent.click(screen.getByTestId('device-force-remove-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('goes back on Back', () => {
    renderConfirm();
    fireEvent.click(screen.getByTestId('device-force-remove-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons while forcing', () => {
    renderConfirm(true);
    expect(screen.getByTestId('device-force-remove-confirm')).toBeDisabled();
    expect(screen.getByTestId('device-force-remove-confirm')).toHaveTextContent('Removing...');
    expect(screen.getByTestId('device-force-remove-back')).toBeDisabled();

    fireEvent.click(screen.getByTestId('device-force-remove-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
