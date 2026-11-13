import { render, screen, fireEvent } from '@testing-library/react';
import { Device } from '@arcus/core';
import { CareBehaviorDevicesField } from '@/components/subsystems/CareBehaviorDevicesField';
import { templateField } from '@/lib/careBehaviors';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';
import { DOOR_ADDR, INACTIVITY_TEMPLATE, MOTION_ADDR, makeCareBehavior } from '../helpers/careBehaviorFixtures';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevices: DeviceEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => mockDevices,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const onChange = jest.fn();
const field = templateField(INACTIVITY_TEMPLATE, 'devices')!;

function renderField(devices: string[] = [MOTION_ADDR], template = INACTIVITY_TEMPLATE) {
  return render(
    <CareBehaviorDevicesField behavior={makeCareBehavior({ devices })} field={field} template={template} onChange={onChange} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = [makeDevice(MOTION_ADDR, { [Device.ATTR_NAME]: 'Hall Motion' })];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorDevicesField', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderField();
    expect(asFragment()).toMatchSnapshot();
  });

  it('lists the template devices by name, falling back to the address', () => {
    renderField();
    expect(screen.getByText('Hall Motion')).toBeInTheDocument();
    expect(screen.getByText(DOOR_ADDR)).toBeInTheDocument();
    expect(screen.getByTestId(`care-field-device-${MOTION_ADDR}`)).toBeChecked();
    expect(screen.getByTestId(`care-field-device-${DOOR_ADDR}`)).not.toBeChecked();
    expect(screen.getByTestId('care-field-devices-all')).not.toBeChecked();
  });

  it('adds a device when checked', () => {
    renderField();
    fireEvent.click(screen.getByTestId(`care-field-device-${DOOR_ADDR}`));
    expect(onChange).toHaveBeenCalledWith({ devices: [MOTION_ADDR, DOOR_ADDR] });
  });

  it('removes a device when unchecked', () => {
    renderField();
    fireEvent.click(screen.getByTestId(`care-field-device-${MOTION_ADDR}`));
    expect(onChange).toHaveBeenCalledWith({ devices: [] });
  });

  it('selects and clears all devices, keeping devices the template no longer offers', () => {
    renderField(['DRIV:dev:old']);
    fireEvent.click(screen.getByTestId('care-field-devices-all'));
    expect(onChange).toHaveBeenLastCalledWith({ devices: ['DRIV:dev:old', MOTION_ADDR, DOOR_ADDR] });
  });

  it('clears all when every device is selected', () => {
    renderField([MOTION_ADDR, DOOR_ADDR]);
    expect(screen.getByTestId('care-field-devices-all')).toBeChecked();
    fireEvent.click(screen.getByTestId('care-field-devices-all'));
    expect(onChange).toHaveBeenCalledWith({ devices: [] });
  });

  it('hides Select All with a single device', () => {
    renderField([], { ...INACTIVITY_TEMPLATE, availableDevices: [MOTION_ADDR] });
    expect(screen.queryByTestId('care-field-devices-all')).not.toBeInTheDocument();
  });

  it('shows an empty message when no devices are available', () => {
    renderField([], { ...INACTIVITY_TEMPLATE, availableDevices: [] });
    expect(screen.getByTestId('care-field-devices-empty')).toHaveTextContent('No compatible devices are paired.');
  });

  it('treats a behavior without devices as none selected', () => {
    render(<CareBehaviorDevicesField behavior={{}} field={field} template={INACTIVITY_TEMPLATE} onChange={onChange} />);
    expect(screen.getByTestId(`care-field-device-${MOTION_ADDR}`)).not.toBeChecked();
  });
});
