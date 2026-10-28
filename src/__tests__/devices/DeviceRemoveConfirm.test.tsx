import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceRemoveConfirm } from '@/components/devices/DeviceRemoveConfirm';

// ── Helpers ───────────────────────────────────────────────────────────

const onConfirm = jest.fn();
const onDismiss = jest.fn();

function renderConfirm(requesting = false) {
  return render(
    <DeviceRemoveConfirm name="Front Door Lock" requesting={requesting} onConfirm={onConfirm} onDismiss={onDismiss} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceRemoveConfirm', () => {
  it('matches snapshot', () => {
    const { container } = renderConfirm();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot while dev:Remove is in flight', () => {
    const { container } = renderConfirm(true);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('names the device in the prompt', () => {
    renderConfirm();
    expect(screen.getByText(/Are you sure you want to remove/)).toHaveTextContent('Front Door Lock');
    expect(screen.getByTestId('device-remove-confirm')).toHaveTextContent('Yes, Remove');
  });

  it('confirms on Yes, Remove', () => {
    renderConfirm();
    fireEvent.click(screen.getByTestId('device-remove-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses on Cancel', () => {
    renderConfirm();
    fireEvent.click(screen.getByTestId('device-remove-cancel'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons while requesting', () => {
    renderConfirm(true);
    expect(screen.getByTestId('device-remove-confirm')).toBeDisabled();
    expect(screen.getByTestId('device-remove-confirm')).toHaveTextContent('Removing...');
    expect(screen.getByTestId('device-remove-cancel')).toBeDisabled();

    fireEvent.click(screen.getByTestId('device-remove-confirm'));
    fireEvent.click(screen.getByTestId('device-remove-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
