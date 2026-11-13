import { render, screen, fireEvent } from '@testing-library/react';
import { Device } from '@arcus/core';
import { CareBehaviorOpenCountField } from '@/components/subsystems/CareBehaviorOpenCountField';
import { DEFAULT_OPEN_COUNT, templateField } from '@/lib/careBehaviors';
import type { CareBehavior, DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';
import { DOOR_ADDR, OPEN_COUNT_TEMPLATE } from '../helpers/careBehaviorFixtures';

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
const field = templateField(OPEN_COUNT_TEMPLATE, 'devicesOpenCount')!;

function renderField(behavior: CareBehavior = { openCount: { [DOOR_ADDR]: 3 } }, template = OPEN_COUNT_TEMPLATE) {
  return render(<CareBehaviorOpenCountField behavior={behavior} field={field} template={template} onChange={onChange} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = [makeDevice(DOOR_ADDR, { [Device.ATTR_NAME]: 'Pantry Door' })];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorOpenCountField', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderField();
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the selected device with its open limit', () => {
    renderField();
    expect(screen.getByText('Pantry Door')).toBeInTheDocument();
    expect(screen.getByTestId(`care-field-open-device-${DOOR_ADDR}`)).toBeChecked();
    expect(screen.getByTestId(`care-field-open-limit-${DOOR_ADDR}`)).toHaveValue('3');
    expect(screen.getByRole('option', { name: '1 time' })).toBeInTheDocument();
  });

  it('hides the limit for an unselected device', () => {
    renderField({});
    expect(screen.getByTestId(`care-field-open-device-${DOOR_ADDR}`)).not.toBeChecked();
    expect(screen.queryByTestId(`care-field-open-limit-${DOOR_ADDR}`)).not.toBeInTheDocument();
  });

  it('selecting a device sets the default limit', () => {
    renderField({ openCount: {} });
    fireEvent.click(screen.getByTestId(`care-field-open-device-${DOOR_ADDR}`));
    expect(onChange).toHaveBeenCalledWith({ openCount: { [DOOR_ADDR]: DEFAULT_OPEN_COUNT } });
  });

  it('unselecting a device removes it', () => {
    renderField();
    fireEvent.click(screen.getByTestId(`care-field-open-device-${DOOR_ADDR}`));
    expect(onChange).toHaveBeenCalledWith({ openCount: {} });
  });

  it('changes a device limit', () => {
    renderField();
    fireEvent.change(screen.getByTestId(`care-field-open-limit-${DOOR_ADDR}`), { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith({ openCount: { [DOOR_ADDR]: 12 } });
  });

  it('shows an empty message when no devices are available', () => {
    renderField({}, { ...OPEN_COUNT_TEMPLATE, availableDevices: [] });
    expect(screen.getByTestId('care-field-open-count-empty')).toBeInTheDocument();
  });
});
