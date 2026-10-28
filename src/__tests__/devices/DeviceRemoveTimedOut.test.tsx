import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceRemoveTimedOut } from '@/components/devices/DeviceRemoveTimedOut';

// ── Helpers ───────────────────────────────────────────────────────────

const onForceRemove = jest.fn();
const onCancel = jest.fn();

function renderTimedOut({ hubMode = true, cancelling = false } = {}) {
  return render(
    <DeviceRemoveTimedOut
      name="Front Door Lock"
      hubMode={hubMode}
      cancelling={cancelling}
      onForceRemove={onForceRemove}
      onCancel={onCancel}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceRemoveTimedOut', () => {
  it('matches snapshot', () => {
    const { container } = renderTimedOut();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('reports that the device was not removed', () => {
    renderTimedOut();
    expect(screen.getByTestId('device-remove-title')).toHaveTextContent('Removal was unsuccessful.');
    expect(screen.getByText(/wasn't removed/)).toHaveTextContent('Front Door Lock');
    expect(screen.getByTestId('device-remove-status')).toHaveAttribute('data-stage', 'timedOut');
  });

  it('asks to force remove on Force Remove', () => {
    renderTimedOut();
    fireEvent.click(screen.getByTestId('device-force-remove'));
    expect(onForceRemove).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('can still cancel', () => {
    renderTimedOut();
    fireEvent.click(screen.getByTestId('device-remove-abort'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onForceRemove).not.toHaveBeenCalled();
  });

  it('offers Close instead of Cancel for a cloud removal', () => {
    renderTimedOut({ hubMode: false });
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent('Close');
  });

  it('disables the abort button while cancelling', () => {
    renderTimedOut({ cancelling: true });
    expect(screen.getByTestId('device-remove-abort')).toBeDisabled();
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent('Cancelling...');
  });
});
