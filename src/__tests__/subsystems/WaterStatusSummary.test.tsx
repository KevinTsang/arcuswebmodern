import { render, screen } from '@testing-library/react';
import { Device, Flow, WaterHeater, WaterSoftener } from '@arcus/core';
import { WaterStatusSummary } from '@/components/subsystems/WaterStatusSummary';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

interface WaterState {
  waterDevices: DeviceEntity[];
  primaryWaterHeater: DeviceEntity | null;
  primaryWaterSoftener: DeviceEntity | null;
  lowSaltDevices: DeviceEntity[];
  continuousUseDevices: DeviceEntity[];
  excessiveUseDevices: DeviceEntity[];
}

let mockWater: WaterState;

jest.mock('@/hooks/useWaterSubsystem', () => ({
  useWaterSubsystem: () => mockWater,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const heater = makeDevice('DRIV:dev:heater', {
  [Device.ATTR_NAME]: 'Water Heater',
  [WaterHeater.ATTR_SETPOINT]: 50,
  [WaterHeater.ATTR_HOTWATERLEVEL]: WaterHeater.HOTWATERLEVEL_MEDIUM,
});

const softener = makeDevice('DRIV:dev:softener', {
  [Device.ATTR_NAME]: 'EcoWater',
  [WaterSoftener.ATTR_CURRENTSALTLEVEL]: 6,
  [WaterSoftener.ATTR_MAXSALTLEVEL]: 12,
  [WaterSoftener.ATTR_RECHARGESTATUS]: WaterSoftener.RECHARGESTATUS_READY,
  [Flow.ATTR_FLOW]: 1.5,
});

function emptyState(): WaterState {
  return {
    waterDevices: [],
    primaryWaterHeater: null,
    primaryWaterSoftener: null,
    lowSaltDevices: [],
    continuousUseDevices: [],
    excessiveUseDevices: [],
  };
}

beforeEach(() => {
  mockWater = {
    ...emptyState(),
    waterDevices: [heater, softener],
    primaryWaterHeater: heater,
    primaryWaterSoftener: softener,
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterStatusSummary', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterStatusSummary />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the primary heater setpoint and hot water level', () => {
      render(<WaterStatusSummary />);
      expect(screen.getByTestId('water-summary-heater-setpoint')).toHaveTextContent('122°F');
      expect(screen.getByTestId('water-summary-hot-water')).toHaveTextContent('Hot Water: Medium');
    });

    it('shows the primary softener salt level and status', () => {
      render(<WaterStatusSummary />);
      expect(screen.getByTestId('water-summary-salt')).toHaveTextContent('50%');
      expect(screen.getByTestId('water-summary-salt')).not.toHaveClass('text-cardinal');
      expect(screen.getByTestId('water-summary-softener-status')).toHaveTextContent('Ready');
    });

    it('shows total current flow', () => {
      render(<WaterStatusSummary />);
      expect(screen.getByTestId('water-summary-flow-value')).toHaveTextContent('1.5 GPM');
    });

    it('lists continuous, excessive and low-salt alerts', () => {
      mockWater.continuousUseDevices = [softener];
      mockWater.excessiveUseDevices = [softener];
      mockWater.lowSaltDevices = [softener];
      render(<WaterStatusSummary />);
      const alerts = screen.getByTestId('water-alerts');
      expect(alerts).toHaveTextContent('EcoWater has detected continuous water use.');
      expect(alerts).toHaveTextContent('EcoWater has detected excessive water use today.');
      expect(alerts).toHaveTextContent('EcoWater is low on salt.');
      expect(screen.getByTestId('water-summary-salt')).toHaveClass('text-cardinal');
    });
  });

  describe('edge cases', () => {
    it('renders nothing with only valves and leak sensors', () => {
      mockWater = { ...emptyState(), waterDevices: [makeDevice('DRIV:dev:valve')] };
      const { container } = render(<WaterStatusSummary />);
      expect(container).toBeEmptyDOMElement();
    });

    it('shows placeholders when the heater and softener report no values', () => {
      mockWater = {
        ...emptyState(),
        primaryWaterHeater: makeDevice('DRIV:dev:heater'),
        primaryWaterSoftener: makeDevice('DRIV:dev:softener'),
      };
      render(<WaterStatusSummary />);
      expect(screen.getByTestId('water-summary-heater-setpoint')).toHaveTextContent('--°F');
      expect(screen.getByTestId('water-summary-salt')).toHaveTextContent('--%');
      expect(screen.getAllByText(/Unknown Device/)).toHaveLength(2);
      expect(screen.queryByTestId('water-summary-flow')).not.toBeInTheDocument();
    });

    it('shows alerts alone when there is no heater or softener', () => {
      mockWater = { ...emptyState(), excessiveUseDevices: [softener] };
      render(<WaterStatusSummary />);
      expect(screen.getByTestId('water-alerts')).toBeInTheDocument();
      expect(screen.queryByTestId('water-summary-heater')).not.toBeInTheDocument();
      expect(screen.queryByTestId('water-summary-softener')).not.toBeInTheDocument();
    });
  });
});
