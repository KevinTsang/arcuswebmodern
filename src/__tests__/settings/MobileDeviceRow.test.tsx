import { render, screen, fireEvent } from '@testing-library/react';
import { MobileDevice } from '@arcus/core';
import { MobileDeviceRow } from '@/components/settings/MobileDeviceRow';
import type { MobileDeviceData } from '@/components/settings/types';

// ── Helpers ───────────────────────────────────────────────────────────

const mockOnRemove = jest.fn();

function makeDevice(overrides: Partial<MobileDeviceData> = {}): MobileDeviceData {
  return {
    [MobileDevice.ATTR_DEVICEINDEX]: 1,
    [MobileDevice.ATTR_OSTYPE]: 'iOS',
    [MobileDevice.ATTR_OSVERSION]: '17.2',
    [MobileDevice.ATTR_DEVICEVENDOR]: 'Apple',
    [MobileDevice.ATTR_DEVICEMODEL]: 'iPhone 15',
    ...overrides,
  };
}

function renderRow(device = makeDevice(), removing = false) {
  return render(
    <ul>
      <MobileDeviceRow device={device} removing={removing} onRemove={mockOnRemove} />
    </ul>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('MobileDeviceRow', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderRow();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the OS and device type', () => {
      renderRow();
      expect(screen.getByText('iOS 17.2')).toBeInTheDocument();
      expect(screen.getByText('Device type: Apple iPhone 15')).toBeInTheDocument();
    });

    it('uses the device name as the title when set', () => {
      renderRow(makeDevice({ [MobileDevice.ATTR_NAME]: "Alex's phone" }));
      expect(screen.getByText("Alex's phone")).toBeInTheDocument();
      expect(screen.getByText('iOS 17.2')).toBeInTheDocument();
    });

    it('falls back to a generic title with no OS or model', () => {
      renderRow({ [MobileDevice.ATTR_DEVICEINDEX]: 3 });
      expect(screen.getByText('Mobile device')).toBeInTheDocument();
      expect(screen.queryByText(/Device type/)).not.toBeInTheDocument();
    });

    it('shows a disabled Removing… button while removing', () => {
      renderRow(makeDevice(), true);
      expect(screen.getByTestId('mobile-device-1-remove')).toBeDisabled();
      expect(screen.getByTestId('mobile-device-1-remove')).toHaveTextContent('Removing…');
    });
  });

  describe('interactions', () => {
    it('asks for confirmation before removing', () => {
      renderRow();
      fireEvent.click(screen.getByTestId('mobile-device-1-remove'));
      expect(mockOnRemove).not.toHaveBeenCalled();
      expect(screen.getByTestId('mobile-device-1-confirm')).toBeInTheDocument();
    });

    it('removes the device on confirm', () => {
      renderRow();
      fireEvent.click(screen.getByTestId('mobile-device-1-remove'));
      fireEvent.click(screen.getByTestId('mobile-device-1-confirm'));
      expect(mockOnRemove).toHaveBeenCalledWith(1);
      expect(screen.queryByTestId('mobile-device-1-confirm')).not.toBeInTheDocument();
    });

    it('cancels the removal', () => {
      renderRow();
      fireEvent.click(screen.getByTestId('mobile-device-1-remove'));
      fireEvent.click(screen.getByTestId('mobile-device-1-cancel'));
      expect(mockOnRemove).not.toHaveBeenCalled();
      expect(screen.getByTestId('mobile-device-1-remove')).toBeInTheDocument();
    });
  });
});
