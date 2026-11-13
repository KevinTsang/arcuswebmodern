import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Device, DoorsNLocksSubsystem } from '@arcus/core';
import { DoorChimeSettings } from '@/components/subsystems/DoorChimeSettings';
import type { ChimeConfig, DeviceEntity, SubsystemEntity } from '@/store/entityTypes';
import { makeDevice, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

let mockDevices: DeviceEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => mockDevices,
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: jest.fn(),
}));

let mockDoorsLocks: { subsystem?: SubsystemEntity; chimeConfig: ChimeConfig };

jest.mock('@/hooks/useDoorsLocksSubsystem', () => ({
  useDoorsLocksSubsystem: () => mockDoorsLocks,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SUB = 'SERV:subdoorsnlocks:place-1';
const KITCHEN = 'DRIV:dev:kitchen';
const BACK = 'DRIV:dev:back';

const toggle = (addr: string) => screen.getByTestId(`door-chime-toggle-${addr}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockDevices = [
    makeDevice(KITCHEN, { [Device.ATTR_NAME]: 'Kitchen Window' }),
    makeDevice(BACK, { [Device.ATTR_NAME]: 'Back Door' }),
  ];
  mockDoorsLocks = {
    subsystem: makeSubsystem(SUB),
    chimeConfig: [
      { device: KITCHEN, enabled: false },
      { device: BACK, enabled: true },
    ],
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DoorChimeSettings', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<DoorChimeSettings />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('lists each device sorted by name with its chime state', () => {
      render(<DoorChimeSettings />);
      const switches = screen.getAllByRole('switch');
      expect(switches.map((s) => s.getAttribute('aria-label'))).toEqual(['Back Door', 'Kitchen Window']);
      expect(toggle(BACK)).toHaveAttribute('aria-checked', 'true');
      expect(toggle(KITCHEN)).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('toggling', () => {
    it('writes the whole chime config with the device flipped', async () => {
      render(<DoorChimeSettings />);
      fireEvent.click(toggle(KITCHEN));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, SUB, {
        [DoorsNLocksSubsystem.ATTR_CHIMECONFIG]: [
          { device: KITCHEN, enabled: true },
          { device: BACK, enabled: true },
        ],
      }));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('turns a chime off', async () => {
      render(<DoorChimeSettings />);
      fireEvent.click(toggle(BACK));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, SUB, {
        [DoorsNLocksSubsystem.ATTR_CHIMECONFIG]: [
          { device: KITCHEN, enabled: false },
          { device: BACK, enabled: false },
        ],
      }));
    });

    it('ignores clicks while a save is in flight', async () => {
      let resolve: (v: object) => void = () => {};
      mockBridgeRequest.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
      render(<DoorChimeSettings />);
      fireEvent.click(toggle(KITCHEN));
      fireEvent.click(toggle(BACK));
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      resolve({});
      await waitFor(() => {
        fireEvent.click(toggle(BACK));
        expect(mockBridgeRequest).toHaveBeenCalledTimes(2);
      });
    });

    it('shows an error when saving fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<DoorChimeSettings />);
      fireEvent.click(toggle(KITCHEN));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to update door chime' },
      }));
    });
  });

  describe('edge cases', () => {
    it('shows an empty state without chime-capable devices', () => {
      mockDoorsLocks.chimeConfig = [];
      render(<DoorChimeSettings />);
      expect(screen.getByTestId('door-chime-empty')).toBeInTheDocument();
    });

    it('shows an empty state before the subsystem loads', () => {
      mockDoorsLocks.subsystem = undefined;
      render(<DoorChimeSettings />);
      expect(screen.getByTestId('door-chime-empty')).toBeInTheDocument();
    });

    it('labels devices missing from the store', () => {
      mockDevices = [];
      mockDoorsLocks.chimeConfig = [{ device: 'DRIV:dev:gone', enabled: true }];
      render(<DoorChimeSettings />);
      expect(screen.getByRole('switch', { name: 'Unknown device' })).toBeInTheDocument();
    });
  });
});
