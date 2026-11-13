import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, CareSubsystem, Device } from '@arcus/core';
import { CareDevices } from '@/components/subsystems/CareDevices';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';
import { CARE_ADDR, makeCareState, type CareState } from '../helpers/careState';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

let mockDevices: DeviceEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => mockDevices,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: jest.fn(),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

let mockCare: CareState;

jest.mock('@/hooks/useCareSubsystem', () => ({
  useCareSubsystem: () => mockCare,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const MOTION = 'DRIV:dev:motion';
const DOOR = 'DRIV:dev:door';
const LAMP = 'DRIV:dev:lamp';

const DEVICES_ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to update care devices' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = [
    makeDevice(MOTION, { [Device.ATTR_NAME]: 'Hallway Motion' }),
    makeDevice(DOOR, { [Device.ATTR_NAME]: 'Back Door' }),
    makeDevice(LAMP, { [Device.ATTR_NAME]: 'Living Room Lamp' }),
  ];
  mockCare = makeCareState({ careCapableDevices: [MOTION, DOOR], careDevices: [MOTION] });
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareDevices', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<CareDevices />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot when empty', () => {
    mockCare = makeCareState();
    const { asFragment } = render(<CareDevices />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('lists only care-capable devices, sorted by name', () => {
      render(<CareDevices />);
      const rows = screen.getAllByTestId(/^care-device-DRIV/);
      expect(rows.map((r) => r.textContent)).toEqual(['Back Door', 'Hallway Motion']);
      expect(screen.queryByTestId(`care-device-${LAMP}`)).not.toBeInTheDocument();
    });

    it('marks the monitored devices', () => {
      render(<CareDevices />);
      expect(screen.getByTestId(`care-device-${MOTION}`)).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId(`care-device-toggle-${MOTION}`)).toBeChecked();
      expect(screen.getByTestId(`care-device-${DOOR}`)).toHaveAttribute('data-selected', 'false');
      expect(screen.getByTestId(`care-device-toggle-${DOOR}`)).not.toBeChecked();
      expect(screen.getByTestId('care-devices-summary')).toHaveTextContent('1 of 2 devices monitored.');
    });
  });

  describe('toggling devices', () => {
    it('adds a device to the care devices', async () => {
      render(<CareDevices />);
      fireEvent.click(screen.getByTestId(`care-device-toggle-${DOOR}`));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CARE_ADDR, { [CareSubsystem.ATTR_CAREDEVICES]: [MOTION, DOOR] },
      ));
    });

    it('removes a device from the care devices', async () => {
      render(<CareDevices />);
      fireEvent.click(screen.getByTestId(`care-device-toggle-${MOTION}`));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, CARE_ADDR, { [CareSubsystem.ATTR_CAREDEVICES]: [] },
      ));
    });

    it('disables the toggles while saving', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<CareDevices />);
      fireEvent.click(screen.getByTestId(`care-device-toggle-${DOOR}`));
      await waitFor(() => expect(screen.getByTestId(`care-device-toggle-${DOOR}`)).toBeDisabled());
      expect(screen.getByTestId(`care-device-toggle-${MOTION}`)).toBeDisabled();
    });

    it('shows an error and re-enables the toggles when saving fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<CareDevices />);
      fireEvent.click(screen.getByTestId(`care-device-toggle-${DOOR}`));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(DEVICES_ERROR));
      await waitFor(() => expect(screen.getByTestId(`care-device-toggle-${DOOR}`)).toBeEnabled());
    });
  });

  describe('edge cases', () => {
    it('shows the empty state with no care-capable devices', () => {
      mockCare = makeCareState();
      render(<CareDevices />);
      expect(screen.getByTestId('care-devices-empty')).toHaveTextContent('No care-capable devices.');
    });

    it('ignores care devices that are no longer care-capable in the count', () => {
      mockCare = makeCareState({ careCapableDevices: [MOTION, DOOR], careDevices: [MOTION, 'DRIV:dev:gone'] });
      render(<CareDevices />);
      expect(screen.getByTestId('care-devices-summary')).toHaveTextContent('1 of 2 devices monitored.');
    });

    it('disables the toggles without a subsystem', () => {
      mockCare = makeCareState({ subsystem: undefined, careCapableDevices: [MOTION] });
      render(<CareDevices />);
      expect(screen.getByTestId(`care-device-toggle-${MOTION}`)).toBeDisabled();
    });

    it('falls back to a placeholder name', () => {
      mockDevices = [makeDevice(MOTION)];
      mockCare = makeCareState({ careCapableDevices: [MOTION] });
      render(<CareDevices />);
      expect(screen.getByTestId(`care-device-${MOTION}`)).toHaveTextContent('Unknown device');
    });
  });
});
