import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EcowaterWaterSoftener } from '@arcus/core';
import { WaterFlowConfigurator } from '@/components/devices/WaterFlowConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetAttribute = jest.fn();
const mockSetAttributes = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({ setAttribute: mockSetAttribute, setAttributes: mockSetAttributes }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:softener';

function makeSoftener(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDRESS, {
    [EcowaterWaterSoftener.ATTR_CONTINUOUSRATE]: 2,
    [EcowaterWaterSoftener.ATTR_ALERTONCONTINUOUSUSE]: true,
    [EcowaterWaterSoftener.ATTR_ALERTONEXCESSIVEUSE]: false,
    ...overrides,
  });
}

const rate = () => screen.getByLabelText('Continuous Water Flow') as HTMLSelectElement;
const toggle = () => screen.getByTestId('water-flow-excessive-toggle');

function notification(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockSetAttributes.mockResolvedValue({});
  mockDevice = makeSoftener();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterFlowConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterFlowConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('selects the option matching the continuous rate', () => {
      render(<WaterFlowConfigurator address={ADDRESS} />);
      expect(rate().value).toBe('MEDIUM');
      expect(screen.getAllByRole('option')).toHaveLength(4);
    });

    it('reflects the excessive use alert state', () => {
      mockDevice = makeSoftener({ [EcowaterWaterSoftener.ATTR_ALERTONEXCESSIVEUSE]: true });
      render(<WaterFlowConfigurator address={ADDRESS} />);
      expect(toggle()).toHaveAttribute('aria-checked', 'true');
    });

    it('defaults to OFF and alert off when the device reports nothing', () => {
      mockDevice = undefined;
      render(<WaterFlowConfigurator address={ADDRESS} />);
      expect(rate().value).toBe('OFF');
      expect(toggle()).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('continuous flow rate', () => {
    it('sets the rate and enables the alert', async () => {
      render(<WaterFlowConfigurator address={ADDRESS} />);
      fireEvent.change(rate(), { target: { value: 'HIGH' } });
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledWith({
        [EcowaterWaterSoftener.ATTR_ALERTONCONTINUOUSUSE]: true,
        [EcowaterWaterSoftener.ATTR_CONTINUOUSRATE]: 8,
      }));
      await waitFor(() => expect(rate()).toBeEnabled());
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('turning it OFF disables the alert', async () => {
      render(<WaterFlowConfigurator address={ADDRESS} />);
      fireEvent.change(rate(), { target: { value: 'OFF' } });
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledWith({
        [EcowaterWaterSoftener.ATTR_ALERTONCONTINUOUSUSE]: false,
        [EcowaterWaterSoftener.ATTR_CONTINUOUSRATE]: 0,
      }));
    });

    it('notifies when saving fails', async () => {
      mockSetAttributes.mockRejectedValueOnce(new Error('fail'));
      render(<WaterFlowConfigurator address={ADDRESS} />);
      fireEvent.change(rate(), { target: { value: 'LOW' } });
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
        notification('Failed to update the continuous flow alert'),
      ));
      await waitFor(() => expect(rate()).toBeEnabled());
    });
  });

  describe('excessive use alert', () => {
    it('toggles the alert on', async () => {
      render(<WaterFlowConfigurator address={ADDRESS} />);
      fireEvent.click(toggle());
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(EcowaterWaterSoftener.ATTR_ALERTONEXCESSIVEUSE, true));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('notifies when the toggle fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<WaterFlowConfigurator address={ADDRESS} />);
      fireEvent.click(toggle());
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(
        notification('Failed to update the excessive use alert'),
      ));
    });
  });
});
