import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MotorizedDoor } from '@arcus/core';
import OpenCloseDoor from '@/components/devices/OpenCloseDoor';

const mockSendCommand = jest.fn().mockResolvedValue(undefined);
let mockDevice: Record<string, unknown> = {};

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
    mockDevice = { [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_CLOSED };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders "Close" when door is open', () => {
    mockDevice = { [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OPEN };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('renders "Close" for obstruction state', () => {
    mockDevice = { [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OBSTRUCTION };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('sends OpenGarageDoor command when opening', async () => {
    mockDevice = { [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_CLOSED };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(mockSendCommand).toHaveBeenCalledWith(MotorizedDoor.CMD_OPENGARAGEDOOR, {});
    });
  });

  it('sends CloseGarageDoor command when closing', async () => {
    mockDevice = { [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OPEN };
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(mockSendCommand).toHaveBeenCalledWith(MotorizedDoor.CMD_CLOSEGARAGEDOOR, {});
    });
  });

  it('defaults to closed when no door state', () => {
    mockDevice = {};
    render(<OpenCloseDoor address="DRIV:dev:test" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});
