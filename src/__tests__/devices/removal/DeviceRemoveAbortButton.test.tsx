import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceRemoveAbortButton } from '@/components/devices/removal/DeviceRemoveAbortButton';

// ── Helpers ───────────────────────────────────────────────────────────

const onCancel = jest.fn();

function renderButton({ hubMode = true, cancelling = false } = {}) {
  return render(<DeviceRemoveAbortButton hubMode={hubMode} cancelling={cancelling} onCancel={onCancel} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceRemoveAbortButton', () => {
  it('matches snapshot', () => {
    const { container } = renderButton();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot while cancelling', () => {
    const { container } = renderButton({ cancelling: true });
    expect(container.firstChild).toMatchSnapshot();
  });

  it.each([
    ['a hub', true, 'Cancel'],
    ['a cloud', false, 'Close'],
  ])('is labelled for %s removal as %s', (_kind, hubMode, label) => {
    renderButton({ hubMode });
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent(label);
  });

  it('cancels on click', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('device-remove-abort'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('is disabled while cancelling (hubMode=%s)', (hubMode) => {
    renderButton({ hubMode, cancelling: true });
    expect(screen.getByTestId('device-remove-abort')).toBeDisabled();
    expect(screen.getByTestId('device-remove-abort')).toHaveTextContent('Cancelling...');

    fireEvent.click(screen.getByTestId('device-remove-abort'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
