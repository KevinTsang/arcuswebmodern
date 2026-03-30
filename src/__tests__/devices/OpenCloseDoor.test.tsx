import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, MotorizedDoor } from '@arcus/core';
import OpenCloseDoor from '@/components/devices/OpenCloseDoor';
import type { DeviceEntity } from '@/store/entityTypes';

const mockSendCommand = jest.fn().mockResolvedValue(undefined);
let mockDevice: DeviceEntity = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test' };

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: jest.fn(),
    sendCommand: mockSendCommand,
  }),
}));

beforeEach(() => {
  mockSendCommand.mockClear();
});

describe('OpenCloseDoor', () => {
  it('renders "Open" when door is closed', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_CLOSED };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders "Close" when door is open', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OPEN };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('renders "Close" for obstruction state', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OBSTRUCTION };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('sends OpenGarageDoor command when opening', async () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_CLOSED };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(mockSendCommand).toHaveBeenCalledWith(MotorizedDoor.CMD_OPENGARAGEDOOR, {});
    });
  });

  it('sends CloseGarageDoor command when closing', async () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OPEN };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(mockSendCommand).toHaveBeenCalledWith(MotorizedDoor.CMD_CLOSEGARAGEDOOR, {});
    });
  });

  it('defaults to closed when no door state', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test' };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});
