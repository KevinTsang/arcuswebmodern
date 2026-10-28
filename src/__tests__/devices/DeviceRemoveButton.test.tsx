import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceRemoveButton } from '@/components/devices/DeviceRemoveButton';

// ── Helpers ───────────────────────────────────────────────────────────

const onClick = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceRemoveButton', () => {
  it('matches snapshot', () => {
    const { container } = render(<DeviceRemoveButton onClick={onClick} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Remove Device', () => {
    render(<DeviceRemoveButton onClick={onClick} />);
    expect(screen.getByTestId('device-remove')).toHaveTextContent('Remove Device');
    expect(screen.getByTestId('device-remove')).toBeEnabled();
  });

  it('starts the removal on click', () => {
    render(<DeviceRemoveButton onClick={onClick} />);
    fireEvent.click(screen.getByTestId('device-remove'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
